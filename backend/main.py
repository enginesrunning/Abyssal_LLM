"""
Text2Graph — backend (chat + file ingestion + email/password auth).

Auth endpoints:
  POST /api/auth/register  {email, first_name, last_name, password} -> {token, user}
  POST /api/auth/login     {email, password}                        -> {token, user}
  GET  /api/auth/me        (Bearer token)                           -> user

Users live in a local SQLite file, passwords are bcrypt-hashed, and the token
is a signed JWT. Set JWT_SECRET in the environment for anything beyond local dev.
"""

import os
import re
import sqlite3
import time
from typing import List

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag import ingest, retrieve

load_dotenv()

LLM_API_KEY = os.getenv("LLM_API_KEY", "").strip()
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "").strip()
LLM_MODEL = os.getenv("LLM_MODEL", "").strip()
JWT_SECRET = os.getenv("JWT_SECRET", "dev-insecure-secret-change-me-please-32b")
TOKEN_TTL = 7 * 24 * 3600  # 7 days

DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

SYSTEM_PROMPT = (
    "You are a helpful assistant specialized in embedded automotive systems "
    "(microcontrollers, peripherals, CAN/LIN, RTOS, functional safety)."
)

app = FastAPI(title="Text2Graph — API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- DB ----------
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.on_event("startup")
def init_db():
    with db() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )"""
        )


# ---------- auth helpers ----------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_pw(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8")[:72], h.encode("utf-8"))
    except Exception:
        return False


def make_token(uid: int, email: str) -> str:
    payload = {"sub": str(uid), "email": email, "exp": int(time.time()) + TOKEN_TTL}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def user_public(row) -> dict:
    return {"id": row["id"], "email": row["email"], "first_name": row["first_name"], "last_name": row["last_name"]}


def current_user(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(authorization[7:], JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (payload["sub"],)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user_public(row)


# ---------- auth models ----------
class RegisterBody(BaseModel):
    email: str
    first_name: str
    last_name: str
    password: str


class LoginBody(BaseModel):
    email: str
    password: str


# ---------- auth routes ----------
@app.post("/api/auth/register")
def register(body: RegisterBody):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Please enter a valid email address")
    if not body.first_name.strip() or not body.last_name.strip():
        raise HTTPException(status_code=422, detail="First and last name are required")
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")

    with db() as conn:
        exists = conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="An account with that email already exists")
        cur = conn.execute(
            "INSERT INTO users (email, first_name, last_name, password_hash, created_at) VALUES (?,?,?,?,?)",
            (email, body.first_name.strip(), body.last_name.strip(), hash_pw(body.password), int(time.time())),
        )
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()

    return {"token": make_token(row["id"], email), "user": user_public(row)}


@app.post("/api/auth/login")
def login(body: LoginBody):
    email = body.email.strip().lower()
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row or not verify_pw(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {"token": make_token(row["id"], email), "user": user_public(row)}


@app.get("/api/auth/me")
def me(user: dict = Depends(current_user)):
    return user


# ---------- chat / files ----------
def get_client():
    if not LLM_API_KEY:
        return None
    from openai import OpenAI

    return OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL or None)


def extract_pdf(data: bytes) -> str:
    try:
        import fitz

        doc = fitz.open(stream=data, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)
    except Exception as e:  # noqa: BLE001
        return f"[pdf could not be read: {e}]"


def extract_file(name: str, ctype: str, data: bytes) -> str:
    lower = name.lower()
    if ctype.startswith("text") or lower.endswith((".txt", ".md", ".csv")):
        return data.decode("utf-8", errors="ignore")
    if lower.endswith(".pdf"):
        return extract_pdf(data)
    return f"[image/binary file: {name}, {len(data)} bytes — not yet parsed]"


@app.get("/api/health")
def health():
    return {"status": "ok", "llm_configured": bool(LLM_API_KEY)}

@app.post("/api/chat")
async def chat(message: str = Form(""), files: List[UploadFile] = File(default=[])):
    extracted = []
    for f in files:
        data = await f.read()
        text = extract_file(f.filename or "file", f.content_type or "", data)
        extracted.append((f.filename or "file", text))

    # RAG step 1: store any uploaded files in the vector DB
    for name, text in extracted:
        if text and text.strip():
            ingest(text, source=name)

    # RAG step 2: retrieve the most relevant chunks for this question
    context_chunks = retrieve(message, k=20) if message.strip() else []
    

    # RAG step 3: build a grounded prompt from the retrieved context
    if context_chunks:
        context = "\n\n".join(f"[{c['source']}] {c['text']}" for c in context_chunks)
        prompt = (
            "Use the following context from the user's documents to answer the question. "
            "Cite the source name in brackets when you use it. If the context doesn't cover "
            "the question, say so and answer from general knowledge.\n\n"
            f"Context:\n{context}\n\nQuestion: {message}"
        )
    else:
        prompt = message

    attached = [n for n, _ in extracted]
    sources = sorted({c["source"] for c in context_chunks})
    client = get_client()
    if client is None:
        note = f" (attached: {', '.join(attached)})" if attached else ""
        return {"reply": f"(mock reply — no LLM key set){note} You said: {message or '[no text]'}",
                "used_llm": False, "attached": attached, "sources": sources}
    try:
        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt or "(no message)"}],
        )
        return {"reply": completion.choices[0].message.content, "used_llm": True, "attached": attached, "sources": sources}
    except Exception as e:  # noqa: BLE001
        return {"reply": f"(LLM error) {e}", "used_llm": False, "attached": attached, "sources": sources}

class GraphBody(BaseModel):
    text: str = ""

@app.post("/api/graph")
def graph(body: GraphBody):
    from graph_builder import build_graph
    return build_graph(body.text)