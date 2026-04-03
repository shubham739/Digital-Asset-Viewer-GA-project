var Viewer3D = (function () {
  "use strict";

  var scene, camera, renderer, animationId;
  var container = null;
  var currentModel = null;

  var isRotating = false;
  var prevMouse = { x: 0, y: 0 };
  var spherical = { theta: 0, phi: Math.PI / 3, radius: 3 };
  var target = new THREE.Vector3(0, 0, 0);

  function loadGLB(url, onLoad, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function () {
      if (xhr.status >= 400) {
        onError(new Error("HTTP " + xhr.status));
        return;
      }
      try {
        var buffer = xhr.response;
        var parsed = parseGLB(buffer);
        onLoad(parsed);
      } catch (e) {
        onError(e);
      }
    };
    xhr.onerror = function () {
      onError(new Error("Network error loading model"));
    };
    xhr.send();
  }

  function parseGLB(buffer) {
    var view = new DataView(buffer);
    var magic = view.getUint32(0, true);
    if (magic !== 0x46546c67) {
      throw new Error("Not a valid GLB file");
    }

    // Read chunks
    var jsonChunkLength = view.getUint32(12, true);
    var jsonBytes = new Uint8Array(buffer, 20, jsonChunkLength);
    var jsonStr = new TextDecoder().decode(jsonBytes);
    var gltf = JSON.parse(jsonStr);

    var binOffset = 20 + jsonChunkLength + 8;
    var binData = buffer.slice(binOffset);

    var group = new THREE.Group();

    // Process meshes
    if (gltf.meshes) {
      gltf.meshes.forEach(function (mesh, mi) {
        mesh.primitives.forEach(function (prim) {
          var geometry = new THREE.BufferGeometry();

          // Position
          if (prim.attributes.POSITION !== undefined) {
            var posAccessor = gltf.accessors[prim.attributes.POSITION];
            var posData = getAccessorData(gltf, binData, posAccessor);
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(posData, 3));
          }

          // Normals
          if (prim.attributes.NORMAL !== undefined) {
            var normAccessor = gltf.accessors[prim.attributes.NORMAL];
            var normData = getAccessorData(gltf, binData, normAccessor);
            geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normData, 3));
          }

          // Indices
          if (prim.indices !== undefined) {
            var idxAccessor = gltf.accessors[prim.indices];
            var idxData = getAccessorData(gltf, binData, idxAccessor);
            geometry.setIndex(new THREE.BufferAttribute(idxData, 1));
          }

          // Material
          var material;
          if (prim.material !== undefined && gltf.materials && gltf.materials[prim.material]) {
            var matDef = gltf.materials[prim.material];
            var color = new THREE.Color(0.7, 0.7, 0.7);
            if (matDef.pbrMetallicRoughness && matDef.pbrMetallicRoughness.baseColorFactor) {
              var c = matDef.pbrMetallicRoughness.baseColorFactor;
              color.setRGB(c[0], c[1], c[2]);
            }
            material = new THREE.MeshStandardMaterial({
              color: color,
              metalness: matDef.pbrMetallicRoughness ? (matDef.pbrMetallicRoughness.metallicFactor || 0) : 0,
              roughness: matDef.pbrMetallicRoughness ? (matDef.pbrMetallicRoughness.roughnessFactor || 1) : 1,
              side: THREE.DoubleSide
            });
          } else {
            material = new THREE.MeshStandardMaterial({
              color: 0x8899aa,
              metalness: 0.2,
              roughness: 0.7,
              side: THREE.DoubleSide
            });
          }

          if (!geometry.attributes.normal) {
            geometry.computeVertexNormals();
          }

          var meshObj = new THREE.Mesh(geometry, material);
          group.add(meshObj);
        });
      });
    }

    // Apply node transforms from scene
    if (gltf.nodes) {
      gltf.nodes.forEach(function (node) {
        if (node.rotation && group.children.length > 0) {
          // Apply first node rotation to group
          group.quaternion.set(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]);
        }
      });
    }

    return group;
  }

  function getAccessorData(gltf, binData, accessor) {
    var bufferView = gltf.bufferViews[accessor.bufferView];
    var offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    var count = accessor.count;
    var compType = accessor.componentType;
    var typeSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[accessor.type] || 1;
    var totalElements = count * typeSize;

    switch (compType) {
      case 5126: // FLOAT
        return new Float32Array(binData, offset, totalElements);
      case 5123: // UNSIGNED_SHORT
        return new Uint16Array(binData, offset, totalElements);
      case 5125: // UNSIGNED_INT
        return new Uint32Array(binData, offset, totalElements);
      case 5121: // UNSIGNED_BYTE
        return new Uint8Array(binData, offset, totalElements);
      default:
        return new Float32Array(binData, offset, totalElements);
    }
  }

  function init(containerEl) {
    container = containerEl;
    container.innerHTML = "";

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.01,
      100
    );
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Lighting
    var ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    var backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-3, 4, -5);
    scene.add(backLight);

    // Grid helper
    var grid = new THREE.GridHelper(6, 12, 0x333333, 0x222222);
    scene.add(grid);

    // Event listeners for orbit controls
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    animate();
  }

  function updateCameraPosition() {
    if (!camera) return;
    camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
    camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    camera.lookAt(target);
  }

  function onMouseDown(e) {
    isRotating = true;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;
  }

  function onMouseUp() {
    isRotating = false;
  }

  function onMouseMove(e) {
    if (!isRotating) return;
    var dx = e.clientX - prevMouse.x;
    var dy = e.clientY - prevMouse.y;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;

    spherical.theta -= dx * 0.008;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + dy * 0.008));
    updateCameraPosition();
  }

  function onWheel(e) {
    e.preventDefault();
    spherical.radius = Math.max(0.5, Math.min(20, spherical.radius + e.deltaY * 0.005));
    updateCameraPosition();
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      isRotating = true;
      prevMouse.x = e.touches[0].clientX;
      prevMouse.y = e.touches[0].clientY;
    }
  }

  function onTouchMove(e) {
    if (!isRotating || e.touches.length !== 1) return;
    e.preventDefault();
    var dx = e.touches[0].clientX - prevMouse.x;
    var dy = e.touches[0].clientY - prevMouse.y;
    prevMouse.x = e.touches[0].clientX;
    prevMouse.y = e.touches[0].clientY;

    spherical.theta -= dx * 0.008;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + dy * 0.008));
    updateCameraPosition();
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function loadModel(url, containerEl) {
    // Reset orbit
    spherical = { theta: 0, phi: Math.PI / 3, radius: 3 };

    if (!renderer || container !== containerEl) {
      init(containerEl);
    }

    // Remove previous model
    if (currentModel) {
      scene.remove(currentModel);
      currentModel = null;
    }

    loadGLB(
      url,
      function (group) {
        // Center and scale the model
        var box = new THREE.Box3().setFromObject(group);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        var scale = 2 / maxDim;

        group.position.sub(center);
        group.scale.multiplyScalar(scale);
        group.position.y += (size.y * scale) / 2;

        scene.add(group);
        currentModel = group;

        // Adjust camera
        spherical.radius = 3;
        updateCameraPosition();
      },
      function (err) {
        console.error("Failed to load 3D model:", err);
        // Show a placeholder sphere on error
        var geo = new THREE.SphereGeometry(0.8, 32, 32);
        var mat = new THREE.MeshStandardMaterial({ color: 0x57068c, wireframe: true });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 1;
        scene.add(mesh);
        currentModel = mesh;
      }
    );
  }

  function dispose() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (renderer) {
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      renderer = null;
    }
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mousemove", onMouseMove);
    if (container) {
      container.innerHTML = "";
    }
    scene = null;
    camera = null;
    currentModel = null;
  }

  function resize() {
    if (!renderer || !camera || !container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  return {
    loadModel: loadModel,
    dispose: dispose,
    resize: resize
  };
})();
