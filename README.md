# Digital Asset Viewer — Research Data Explorer

A lightweight, open-source prototype interface for browsing, searching, and displaying research digital assets — including **3D models**, **images**, and **datasets** — with metadata aligned to the [DataCite](https://datacite.org/) schema.

Built with **pure HTML, CSS, and JavaScript** (no frontend frameworks) and a **Python/Flask** REST API backend.

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.10%2B-brightgreen)
![JavaScript](https://img.shields.io/badge/javascript-vanilla-yellow)

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Software Library Appraisal](#software-library-appraisal)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

- **Gallery View** — Responsive card grid displaying asset thumbnails, titles, creators, dates, and format badges.
- **3D Model Viewer** — Interactive Three.js-powered viewer with orbit controls (rotate, zoom, pan) supporting glTF/glB files.
- **Image Viewer** — High-resolution image display with metadata panel.
- **Dataset Display** — Metadata-focused view for tabular/document assets.
- **Search** — Free-text search across titles, descriptions, creators, and subject keywords with debounced input.
- **Filters & Sorting** — Filter by asset format; sort by date, title, or creator.
- **Detail Modal** — Full metadata panel with DataCite-aligned fields: title, creator, date, resource type, file format, license, source, DOI, subjects, and dimensions.
- **Accessibility** — Semantic HTML, ARIA labels, keyboard navigation, focus management.
- **Responsive Design** — Adapts to desktop, tablet, and mobile screens.
- **REST API** — Clean JSON API with query, filter, and sort parameters.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | HTML, CSS, JavaScript (vanilla) | No-framework requirement; maximum portability and transparency |
| 3D Rendering | Three.js (r128, CDN) | Industry-standard WebGL library for browser-based 3D |
| Backend | Python 3 + Flask | Lightweight, widely adopted Python web framework |
| Data Store | JSON file | Prototype-appropriate; easily swappable for SQLite/PostgreSQL |
| Deployment | Render / Railway / Heroku | Free-tier PaaS with Flask support |

---

## Getting Started

### Prerequisites

- **Python 3.10+** with `pip`
- **Git**
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/digital-asset-viewer.git
cd digital-asset-viewer

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Run the development server
python app.py
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## Project Structure

```
digital-asset-viewer/
├── app.py                   # Flask application & REST API
├── requirements.txt         # Python dependencies
├── LICENSE                  # MIT License
├── .gitignore
├── data/
│   └── assets.json          # Sample asset metadata (DataCite-aligned)
├── templates/
│   └── index.html           # Single-page HTML template
└── static/
    ├── css/
    │   └── styles.css       # All styles (pure CSS, no preprocessors)
    └── js/
        ├── app.js           # Application logic: gallery, search, modal
        └── viewer3d.js      # Three.js 3D model viewer module
```

---

## API Documentation

### `GET /api/assets`

Returns a list of assets with optional filtering.

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Free-text search across title, description, creator, subjects |
| `format` | string | Filter by format: `3d-model`, `image`, `document` |
| `sort` | string | Sort field: `title`, `date`, `creator` (default: `date`) |
| `order` | string | `asc` or `desc` (default: `desc`) |

**Example:**
```
GET /api/assets?q=smithsonian&format=3d-model&sort=date&order=desc
```

**Response:**
```json
{
  "count": 2,
  "results": [
    {
      "id": "asset-001",
      "title": "Apollo 11 Command Module Columbia",
      "creator": "Smithsonian National Air and Space Museum",
      "format": "3d-model",
      "date": "2016-06-29",
      "license": "CC0 1.0 Universal (Public Domain)",
      ...
    }
  ]
}
```

### `GET /api/assets/<asset_id>`

Returns a single asset by ID.

### `GET /api/formats`

Returns a list of distinct format values for the filter UI.

---

## Software Library Appraisal

This section documents the evaluation of candidate libraries considered during development, including the rationale for each selection. This kind of appraisal is a key part of any R&D prototyping process.

### 3D Rendering: Three.js vs. Babylon.js vs. Model Viewer

| Criterion | Three.js | Babylon.js | \<model-viewer\> |
|-----------|----------|------------|-----------------|
| **Bundle Size** | ~600 KB (CDN, r128) | ~3.3 MB | ~800 KB |
| **glTF Support** | Full (with GLTFLoader) | Full (built-in) | Full |
| **Learning Curve** | Moderate — large API but well-documented | Steeper — larger API surface, IDE-oriented | Low — declarative HTML element |
| **Customization** | High — full scene graph control, custom shaders, animation | Very high — PBR pipeline, physics engine, GUI inspector | Limited — good defaults but less control over rendering pipeline |
| **Community & Docs** | Largest community; extensive examples; active GitHub | Strong community; excellent playground tool | Google-maintained; good docs but narrower scope |
| **CDN Availability** | Yes (cdnjs, unpkg) | Yes but large | Yes |
| **Orbit Controls** | Requires add-on (OrbitControls.js) or manual implementation | Built-in (ArcRotateCamera) | Built-in |

**Decision: Three.js** — Selected for its balance of flexibility, community size, and reasonable bundle size. The CDN build (r128) allows loading without Node.js build tools, which aligns with the no-framework constraint. The main trade-off is needing to implement orbit controls manually since the CDN build doesn't include the OrbitControls add-on, but this provides a learning opportunity and keeps the dependency footprint minimal. Babylon.js was ruled out primarily due to bundle size; `<model-viewer>` was considered but provides less control over the rendering pipeline for future features like annotation overlays.

### Backend Framework: Flask vs. FastAPI vs. Django

| Criterion | Flask | FastAPI | Django |
|-----------|-------|---------|--------|
| **Learning Curve** | Low — minimal boilerplate | Moderate — async patterns, type hints | Higher — opinionated, ORM, admin |
| **Performance** | Good for prototypes | Excellent — async/await, auto OpenAPI | Good but heavier |
| **Footprint** | Minimal — ~30 KB | Small — ~100 KB | Large — full framework |
| **API Documentation** | Manual (or Flask-RESTX) | Auto-generated Swagger/OpenAPI | Django REST Framework add-on |
| **Ecosystem Fit** | Standard in academic/GLAM tooling | Growing adoption | Common in production web apps |

**Decision: Flask** — Chosen for its minimal footprint, low barrier to entry, and prevalence in academic and GLAM development environments (InvenioRDM itself is built on Flask). FastAPI's auto-documentation is appealing but introduces async complexity that isn't necessary at this prototype stage. Django's ORM and admin would be overkill for a JSON-file-backed prototype.

### CSS Approach: Vanilla CSS vs. Tailwind vs. Bootstrap

| Criterion | Vanilla CSS | Tailwind CSS | Bootstrap |
|-----------|-------------|-------------|-----------|
| **Build Tools Required** | None | Yes (PostCSS/CLI) | Optional (CDN available) |
| **Customization** | Full control | High (config-based) | Moderate (theming, overrides) |
| **File Size** | Only what you write | Purged build is small | ~25 KB minified CSS |
| **Framework Dependency** | None | None (utility classes) | jQuery historically; v5 is standalone |
| **Learning Value** | Maximum — forces understanding of the box model, layout, specificity | Moderate — utility-first is a paradigm shift | Low — pre-built components |

**Decision: Vanilla CSS** — Aligns with the no-framework development constraint and demonstrates core web fundamentals. CSS custom properties (variables) are used for theming. Bootstrap was ruled out because it would mask CSS proficiency; Tailwind requires a build step that contradicts the "from scratch" philosophy.

---

## Deployment

### Render (recommended for free hosting)

1. Push the repo to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set the **Build Command** to `pip install -r requirements.txt`.
4. Set the **Start Command** to `gunicorn app:app`.
5. Render will auto-deploy on each push to `main`.

### Railway / Heroku

Similar process — both detect Flask apps automatically via `requirements.txt` and a `Procfile`:

```
# Procfile
web: gunicorn app:app
```

---

## Roadmap

- [ ] Add local `.glb` file upload for user-provided 3D models
- [ ] Implement IIIF Image API viewer for high-resolution zoomable images
- [ ] Integrate with InvenioRDM REST API for live repository data
- [ ] Add annotation/measurement tools for 3D models
- [ ] Support web archiving display (WARC/WACZ files) with ReplayWeb.page
- [ ] SQLite backend for persistent metadata storage
- [ ] User authentication for private collections
- [ ] Export metadata as DataCite XML / JSON-LD

---

## License

This project is licensed under the [MIT License](LICENSE).

---

**Built by [Shubham Tanwar](https://github.com/yourusername)** — NYU Computer Science, M.S.
