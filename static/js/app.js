/**
 * app.js — Digital Asset Viewer Application
 *
 * Pure vanilla JavaScript — no frameworks or build tools.
 *
 * Author: Shubham Tanwar
 */

(function () {
  "use strict";
  var searchInput    = document.getElementById("search-input");
  var clearBtn       = document.getElementById("clear-search");
  var formatFilter   = document.getElementById("format-filter");
  var sortSelect     = document.getElementById("sort-select");
  var resultsCount   = document.getElementById("results-count");
  var gallery        = document.getElementById("gallery");
  var loadingEl      = document.getElementById("loading");
  var emptyState     = document.getElementById("empty-state");
  var modal          = document.getElementById("detail-modal");
  var modalClose     = document.getElementById("modal-close");
  var viewer3dEl     = document.getElementById("viewer-3d");
  var viewerImageEl  = document.getElementById("viewer-image");
  var viewerDocEl    = document.getElementById("viewer-document");
  var viewerControls = document.getElementById("viewer-controls");

  var debounceTimer = null;
  var currentAssets = [];

  function fetchAssets(params) {
    var query = new URLSearchParams(params || {}).toString();
    var url = "/api/assets" + (query ? "?" + query : "");

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("API error: " + res.status);
        return res.json();
      });
  }

  function fetchFormats() {
    return fetch("/api/formats")
      .then(function (res) { return res.json(); });
  }

  function badgeClass(format) {
    switch (format) {
      case "3d-model": return "badge badge-3d-model";
      case "image":    return "badge badge-image";
      default:         return "badge badge-document";
    }
  }

  function formatLabel(format) {
    switch (format) {
      case "3d-model": return "3D Model";
      case "image":    return "Image";
      case "document": return "Dataset";
      default:         return format;
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    var parts = dateStr.split("-");
    var months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }

  function createCard(asset) {
    var card = document.createElement("article");
    card.className = "card";
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", asset.title);
    card.dataset.id = asset.id;

    var thumbSrc = asset.thumbnail || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop";

    card.innerHTML =
      '<img class="card-thumb" src="' + escapeHtml(thumbSrc) + '" alt="" loading="lazy" />' +
      '<div class="card-body">' +
        '<span class="' + badgeClass(asset.format) + '">' + formatLabel(asset.format) + '</span>' +
        '<h3 class="card-title">' + escapeHtml(asset.title) + '</h3>' +
        '<p class="card-creator">' + escapeHtml(asset.creator) + '</p>' +
        '<p class="card-date">' + formatDate(asset.date) + '</p>' +
      '</div>';

    card.addEventListener("click", function () { openDetail(asset); });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDetail(asset);
      }
    });

    return card;
  }

  function renderGallery(assets) {
    gallery.innerHTML = "";
    currentAssets = assets;

    if (assets.length === 0) {
      emptyState.hidden = false;
      resultsCount.textContent = "No results";
      return;
    }

    emptyState.hidden = true;
    resultsCount.textContent = assets.length + " asset" + (assets.length !== 1 ? "s" : "");

    var fragment = document.createDocumentFragment();
    assets.forEach(function (asset) {
      fragment.appendChild(createCard(asset));
    });
    gallery.appendChild(fragment);
  }


  function openDetail(asset) {
    // Set metadata
    document.getElementById("detail-title").textContent = asset.title;
    document.getElementById("detail-creator").textContent = asset.creator;
    document.getElementById("detail-description").textContent = asset.description;
    document.getElementById("detail-date").textContent = formatDate(asset.date);
    document.getElementById("detail-resource-type").textContent = asset.resourceType || "—";
    document.getElementById("detail-file-format").textContent = asset.fileFormat || "—";
    document.getElementById("detail-license").textContent = asset.license || "—";
    document.getElementById("detail-source").textContent = asset.source || "—";

    var doiEl = document.getElementById("detail-doi");
    doiEl.textContent = asset.doi || "—";
    doiEl.href = asset.doi || "#";

    var formatEl = document.getElementById("detail-format");
    formatEl.className = badgeClass(asset.format);
    formatEl.textContent = formatLabel(asset.format);

    // Subjects
    var subjectsEl = document.getElementById("detail-subjects");
    subjectsEl.innerHTML = "";
    if (asset.subjects && asset.subjects.length) {
      asset.subjects.forEach(function (s) {
        var tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = s;
        subjectsEl.appendChild(tag);
      });
      document.getElementById("subjects-section").hidden = false;
    } else {
      document.getElementById("subjects-section").hidden = true;
    }

    // Dimensions
    var dimEl = document.getElementById("detail-dimensions");
    dimEl.innerHTML = "";
    if (asset.dimensions) {
      Object.keys(asset.dimensions).forEach(function (key) {
        var item = document.createElement("span");
        item.className = "dim-item";
        item.innerHTML = '<span class="dim-label">' + escapeHtml(capitalizeKey(key)) + ':</span> ' + escapeHtml(String(asset.dimensions[key]));
        dimEl.appendChild(item);
      });
      document.getElementById("dimensions-section").hidden = false;
    } else {
      document.getElementById("dimensions-section").hidden = true;
    }

    // Show modal first so layout dimensions (clientWidth/clientHeight) are available for the 3D canvas
    modal.hidden = false;
    document.body.style.overflow = "hidden";

    // Viewer pane — show appropriate viewer
    viewer3dEl.hidden = true;
    viewerImageEl.hidden = true;
    viewerDocEl.hidden = true;
    viewerControls.hidden = true;
    Viewer3D.dispose();

    if (asset.format === "3d-model" && asset.modelUrl) {
      viewer3dEl.hidden = false;
      viewerControls.hidden = false;
      Viewer3D.loadModel(asset.modelUrl, viewer3dEl);
    } else if (asset.format === "image" && (asset.imageUrl || asset.thumbnail)) {
      viewerImageEl.hidden = false;
      viewerImageEl.src = asset.imageUrl || asset.thumbnail;
      viewerImageEl.alt = asset.title;
    } else {
      viewerDocEl.hidden = false;
    }

    modalClose.focus();
  }

  function closeDetail() {
    modal.hidden = true;
    document.body.style.overflow = "";
    Viewer3D.dispose();
    viewer3dEl.hidden = true;
    viewerImageEl.hidden = true;
    viewerDocEl.hidden = true;
    viewerControls.hidden = true;
    console.log("hi hello");
    
  }

  function performSearch() {
    var params = {};

    var q = searchInput.value.trim();
    if (q) params.q = q;

    var fmt = formatFilter.value;
    if (fmt) params.format = fmt;

    var sortVal = sortSelect.value.split("-");
    params.sort = sortVal[0];
    params.order = sortVal[1];

    // Show/hide clear button
    clearBtn.hidden = !q;

    loadingEl.hidden = false;
    emptyState.hidden = true;
    gallery.innerHTML = "";

    fetchAssets(params)
      .then(function (data) {
        loadingEl.hidden = true;
        renderGallery(data.results);
      })
      .catch(function (err) {
        loadingEl.hidden = true;
        console.error("Search error:", err);
        resultsCount.textContent = "Error loading assets";
      });
  }

  function debouncedSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 300);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function capitalizeKey(key) {
    return key.replace(/([A-Z])/g, " $1")
              .replace(/^./, function (c) { return c.toUpperCase(); });
  }

  searchInput.addEventListener("input", debouncedSearch);
  clearBtn.addEventListener("click", function () {
    searchInput.value = "";
    clearBtn.hidden = true;
    performSearch();
    searchInput.focus();
  });
  formatFilter.addEventListener("change", performSearch);
  sortSelect.addEventListener("change", performSearch);

  modalClose.addEventListener("click", closeDetail);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeDetail();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeDetail();
  });

  window.addEventListener("resize", function () {
    Viewer3D.resize();
  });

  function init() {
    // Populate format filter dropdown
    fetchFormats()
      .then(function (formats) {
        formats.forEach(function (fmt) {
          var opt = document.createElement("option");
          opt.value = fmt;
          opt.textContent = formatLabel(fmt);
          formatFilter.appendChild(opt);
        });
      })
      .catch(function (err) {
        console.error("Failed to load formats:", err);
      });

    // Load initial gallery
    performSearch();
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
