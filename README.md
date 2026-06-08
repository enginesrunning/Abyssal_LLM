# Embedded Automotive LLM — Day 1 skeleton

A document-aware chatbot for the embedded automotive domain, with a 3D
"constellation" view of related concepts. This is the Day 1 scaffold: the
plumbing works end-to-end, the constellation shows placeholder data, and the
chat runs in mock mode until you add an LLM key.

```
embedded-automotive-llm/
├── backend/      FastAPI: /api/health, /api/chat, /api/graph
└── frontend/     React + Vite + react-force-graph-3d
```

## Prerequisites

- Python 3.10+
- Node.js 18+ (with npm)

## 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # optional: add an LLM key (see below)
uvicorn main:app --reload --port 8000
```

Check it: open http://localhost:8000/api/health — you should see
`{"status":"ok","llm_configured":false}`.

### Adding an LLM (optional for Day 1)

Open `.env` and uncomment ONE provider block (Groq, Gemini, or OpenAI), then
paste your key. Restart uvicorn. The chat will switch from mock replies to real
ones. Model names/endpoints change, so check the provider's current docs.

## 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL it prints (http://localhost:5173). If you hit a peer-dependency
error on install, try `npm install --legacy-peer-deps`.

## What success looks like

- A black 3D space with ~18 colored nodes (PWM, CAN bus, ISO 26262, …) you can
  rotate, zoom, and drag.
- A status line reading "backend ok …".
- Typing in the chat box returns a reply (mock, or real if you added a key).

If the graph is empty or chat fails with "backend unreachable", make sure the
backend is running on port 8000 — the Vite dev server proxies `/api` to it.

## Where this goes next

- Day 2: replace the upload-less backend with a real document ingestion endpoint.
- Day 5: replace `DUMMY_GRAPH` in `backend/main.py` with a graph built from
  document embeddings (cosine similarity + UMAP).
