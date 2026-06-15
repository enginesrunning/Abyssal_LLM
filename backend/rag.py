"""Retrieval-Augmented Generation core: chunk, embed, store, and search documents."""
import uuid
import chromadb
from chromadb.utils import embedding_functions

_collection = None


def _get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path="./chroma_db")
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"  # same model family as the constellation
        )
        _collection = client.get_or_create_collection("documents", embedding_function=ef)
    return _collection


def chunk_text(text, size=500, overlap=80):
    text = " ".join((text or "").split())
    chunks, i = [], 0
    while i < len(text):
        chunks.append(text[i:i + size])
        i += size - overlap
    return [c for c in chunks if c.strip()]


def ingest(text, source="upload"):
    chunks = chunk_text(text)
    if not chunks:
        return 0
    col = _get_collection()
    ids = [f"{source}-{uuid.uuid4().hex[:6]}-{i}" for i in range(len(chunks))]
    metas = [{"source": source, "chunk": i} for i in range(len(chunks))]
    col.add(documents=chunks, ids=ids, metadatas=metas)
    return len(chunks)


def retrieve(query, k=4):
    col = _get_collection()
    if col.count() == 0:
        return []
    res = col.query(query_texts=[query], n_results=min(k, col.count()))
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0] 
    return [{"text": d, "source": m.get("source", "?")} for d, m in zip(docs, metas)]