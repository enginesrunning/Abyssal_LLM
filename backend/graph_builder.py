"""Turns conversation text into a semantic concept graph (the constellation)."""
from functools import lru_cache
import numpy as np
import networkx as nx


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer("all-MiniLM-L6-v2")  # tiny, CPU-friendly


@lru_cache(maxsize=1)
def _keybert():
    from keybert import KeyBERT
    return KeyBERT(model=_model())


def extract_terms(text, top_n=25):
    # KeyBERT: embedding-based keyphrase extraction (beats raw frequency/TF-IDF)
    pairs = _keybert().extract_keywords(
        text, keyphrase_ngram_range=(1, 2), stop_words="english",
        top_n=top_n, use_mmr=True, diversity=0.6,
    )
    return [t for t, _ in pairs if len(t) > 1]


def build_graph(text, top_n=40, knn=6, sim_threshold=0.15):
    text = (text or "").strip()
    if len(text) < 20:
        return {"nodes": [], "links": []}

    terms = extract_terms(text, top_n)
    if len(terms) < 2:
        return {"nodes": [], "links": []}

    embs = _model().encode(terms, normalize_embeddings=True)
    sims = embs @ embs.T  # cosine similarity (vectors are normalized)

    # semantic edges: connect each term to its top-k most similar neighbors
    G = nx.Graph()
    G.add_nodes_from(terms)
    for i in range(len(terms)):
        added = 0
        for j in np.argsort(-sims[i]):
            if j == i:
                continue
            if sims[i][j] < sim_threshold:
                break
            G.add_edge(terms[i], terms[j], weight=float(sims[i][j]))
            added += 1
            if added >= knn:
                break

    # node importance via PageRank; clusters via community detection
    pr = nx.pagerank(G, weight="weight") if G.number_of_edges() else {t: 1.0 for t in terms}
    prmax = max(pr.values()) or 1.0
    try:
        comms = list(nx.community.greedy_modularity_communities(G, weight="weight"))
    except Exception:
        comms = [set(terms)]
    group_of = {t: gi for gi, com in enumerate(comms) for t in com}


# embedding lookup, then pick each group's "hub": the term nearest its centroid
    emb_of = {t: embs[i] for i, t in enumerate(terms)}
    hub_of = {}
    for gi, com in enumerate(comms):
        members = list(com)
        if not members:
            continue
        centroid = np.mean([emb_of[t] for t in members], axis=0)
        hub_of[gi] = max(members, key=lambda t: float(np.dot(emb_of[t], centroid)))

    nodes = []
    for t in terms:
        gi = group_of.get(t, 0)
        is_hub = hub_of.get(gi) == t
        nodes.append({
            "id": t,
            "group": gi,
            "val": 40 if is_hub else 4 + 12 * (pr.get(t, 0) / prmax),
            "isHub": is_hub,
        })

    links = []
    seen = set()
    def _add(u, v, w):
        key = tuple(sorted((u, v)))
        if u != v and key not in seen:
            seen.add(key)
            links.append({"source": u, "target": v, "weight": w})

    for u, v, d in G.edges(data=True):              # keep same-group similarity edges
        if group_of.get(u) == group_of.get(v):
            _add(u, v, d["weight"])
    for t in terms:                                  # connect every node to its group hub
        hub = hub_of.get(group_of.get(t, 0))
        if hub and hub != t:
            _add(t, hub, 1.0)

    return {"nodes": nodes, "links": links}