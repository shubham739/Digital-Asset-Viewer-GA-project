# Digital Asset Viewer — Research Data Explorer

A lightweight, open-source prototype interface for browsing, searching, and displaying research digital assets — including **3D models**, **images**, and **datasets** — with metadata aligned to the [DataCite](https://datacite.org/) schema.

Built with **pure HTML, CSS, and JavaScript** (no frontend frameworks) and a **Python/Flask** REST API backend.

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
Live  - https://digital-asset-viewer-ga-project.onrender.com/
