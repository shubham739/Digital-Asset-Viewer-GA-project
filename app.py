"""
Digital Asset Viewer — Flask Backend
=====================================
A lightweight REST API serving research data asset metadata.
Prototype interface for browsing, searching, and displaying
digital assets including 3D models, images, and documents.

Author: Shubham Tanwar
License: MIT
"""

import json
import os
from flask import Flask, jsonify, request, send_from_directory, render_template

app = Flask(__name__, static_folder="static", template_folder="templates")

# ---------------------------------------------------------------------------
# Data layer – loads asset metadata from a JSON file.
# In production this could be backed by SQLite, PostgreSQL, or an
# InvenioRDM-compatible data source.
# ---------------------------------------------------------------------------

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "assets.json")


def load_assets():
    """Load asset metadata from the JSON data store."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------


@app.route("/")
def index():
    """Serve the main single-page application."""
    return render_template("index.html")


@app.route("/api/assets", methods=["GET"])
def get_assets():
    """
    List all assets with optional filtering.

    Query Parameters
    ----------------
    q       : str   — free-text search across title, description, creator
    format  : str   — filter by asset format (e.g. "3d-model", "image", "document")
    license : str   — filter by license type
    sort    : str   — sort field: "title", "date", "creator" (default: "date")
    order   : str   — "asc" or "desc" (default: "desc")
    """
    assets = load_assets()

    # --- Free-text search ---
    query = request.args.get("q", "").strip().lower()
    if query:
        assets = [
            a for a in assets
            if query in a.get("title", "").lower()
            or query in a.get("description", "").lower()
            or query in a.get("creator", "").lower()
            or query in " ".join(a.get("subjects", [])).lower()
        ]

    # --- Format filter ---
    fmt = request.args.get("format", "").strip().lower()
    if fmt:
        assets = [a for a in assets if a.get("format", "").lower() == fmt]

    # --- License filter ---
    lic = request.args.get("license", "").strip().lower()
    if lic:
        assets = [a for a in assets if lic in a.get("license", "").lower()]

    # --- Sorting ---
    sort_field = request.args.get("sort", "date")
    order = request.args.get("order", "desc")
    reverse = order == "desc"
    if sort_field in ("title", "date", "creator"):
        assets.sort(key=lambda a: a.get(sort_field, "").lower(), reverse=reverse)

    return jsonify({
        "count": len(assets),
        "results": assets
    })


@app.route("/api/assets/<asset_id>", methods=["GET"])
def get_asset(asset_id):
    """Retrieve a single asset by its unique identifier."""
    assets = load_assets()
    asset = next((a for a in assets if a["id"] == asset_id), None)
    if asset is None:
        return jsonify({"error": "Asset not found"}), 404
    return jsonify(asset)


@app.route("/api/formats", methods=["GET"])
def get_formats():
    """Return a list of distinct asset formats for filter UI."""
    assets = load_assets()
    formats = sorted(set(a.get("format", "unknown") for a in assets))
    return jsonify(formats)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
