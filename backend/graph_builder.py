"""Turns conversation text into a semantic concept graph (the constellation)."""
from functools import lru_cache
import numpy as np
import networkx as nx

# --- term filtering ---------------------------------------------------------
_ALLOWLIST = {
    "pwm", "led", "can", "spi", "i2c", "gpio", "adc", "dac", "uart",
    "register", "watchdog", "fault", "diagnostic", "diagnostics",
}
_BLOCKLIST = {
    "overview", "info", "information", "example", "examples", "thing", "things",
    "way", "ways", "use", "uses", "usage", "type", "types", "kind", "kinds",
    "lot", "number", "case", "cases", "part", "parts", "detail", "details",
    "general", "summary", "note", "notes", "point", "points", "tell",
    "pros", "cons", "advantage", "advantages", "disadvantage", "disadvantages",
    "feature", "features",
}


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer("all-MiniLM-L6-v2")


@lru_cache(maxsize=1)
def _keybert():
    from keybert import KeyBERT
    return KeyBERT(model=_model())


@lru_cache(maxsize=1)
def _nlp():
    import spacy
    return spacy.load("en_core_web_sm", disable=["ner"])   # keep parser + lemmatizer


_ALLOWED_POS = ("NOUN", "PROPN", "ADJ")


def _is_concept(term):
    t = term.strip().lower()
    if len(t) < 3 or t in _BLOCKLIST:
        return False
    if t in _ALLOWLIST or any(ch.isdigit() or ch == "_" for ch in t):
        return True
    toks = [tok for tok in _nlp()(t) if tok.is_alpha]
    if not toks:
        return False
    if any(tok.text.lower() in _BLOCKLIST for tok in toks):
        return False
    if all(tok.is_stop for tok in toks):
        return False
    if any(tok.pos_ not in _ALLOWED_POS for tok in toks):
        return False
    if not any(tok.pos_ in ("NOUN", "PROPN") for tok in toks):
        return False
    return True


def extract_terms(text, top_n=25):
    cand = []
    for ngram in ((1, 1), (1, 2)):
        cand += _keybert().extract_keywords(
            text, keyphrase_ngram_range=ngram, stop_words="english",
            top_n=top_n * 3, use_mmr=True, diversity=0.6,
        )
    terms, seen = [], set()
    for t, _ in cand:
        t = t.strip()
        key = t.lower()
        if key in seen:
            continue
        if _is_concept(t):
            seen.add(key)
            terms.append(t)
        if len(terms) >= top_n:
            break
    return terms


def extract_relations(text, concept_terms):
    """spaCy subject-verb-object triples, mapped onto known concept terms."""
    concepts = {c.lower(): c for c in concept_terms}

    def match(token):
        span = token.subtree
        words = {t.text.lower() for t in span} | {token.text.lower()}
        for lc, orig in concepts.items():
            head = lc.split()[-1]
            if head in words or (lc in text.lower() and head == token.text.lower()):
                return orig
        return None

    triples, seen = [], set()
    for sent in _nlp()(text).sents:
        for tok in sent:
            if tok.pos_ != "VERB":
                continue
            subj = next((c for c in tok.children if c.dep_ in ("nsubj", "nsubjpass")), None)
            obj = next((c for c in tok.children if c.dep_ in ("dobj", "pobj", "attr", "obj")), None)
            if not obj:
                prep = next((c for c in tok.children if c.dep_ == "prep"), None)
                obj = next((c for c in prep.children if c.dep_ == "pobj"), None) if prep else None
            if not (subj and obj):
                continue
            s, o = match(subj), match(obj)
            if s and o and s != o:
                verb = tok.lemma_ or tok.text.lower()
                key = (s, verb, o)
                if key not in seen:
                    seen.add(key)
                    triples.append({"subject": s, "relation": verb, "object": o})
    return triples


def build_graph(text, top_n=40, knn=6, sim_threshold=0.15):
    text = (text or "").strip()
    if len(text) < 20:
        return {"nodes": [], "links": []}

    terms = extract_terms(text, top_n)
    if len(terms) < 2:
        return {"nodes": [], "links": []}

    embs = _model().encode(terms, normalize_embeddings=True)
    sims = embs @ embs.T

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

    pr = nx.pagerank(G, weight="weight") if G.number_of_edges() else {t: 1.0 for t in terms}
    prmax = max(pr.values()) or 1.0
    try:
        comms = list(nx.community.greedy_modularity_communities(G, weight="weight"))
    except Exception:
        comms = [set(terms)]
    group_of = {t: gi for gi, com in enumerate(comms) for t in com}

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
            "kind": "concept",
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

    for u, v, d in G.edges(data=True):
        if group_of.get(u) == group_of.get(v):
            _add(u, v, d["weight"])
    for t in terms:
        hub = hub_of.get(group_of.get(t, 0))
        if hub and hub != t:
            _add(t, hub, 1.0)

    # typed relations: concept --> [relation marker] --> concept
    _SKIP_VERBS = {"be", "have", "do", "get"}
    term_set = set(terms)
    rels = extract_relations(text, terms)
    print(f"[graph] {len(rels)} raw triples:", [(r['subject'], r['relation'], r['object']) for r in rels])

    kept = 0
    for r in rels:
        s, o, verb = r["subject"], r["object"], r["relation"]
        if verb in _SKIP_VERBS or s not in term_set or o not in term_set:
            continue
        rid = f"__rel_{kept}"
        nodes.append({
            "id": rid, "label": verb, "kind": "relation",
            "group": group_of.get(s, 0), "val": 3, "isHub": False,
        })
        links.append({"source": s, "target": rid, "weight": 1.0, "rel": True})
        links.append({"source": rid, "target": o, "weight": 1.0, "rel": True})
        kept += 1
        if kept >= 15:
            break
    print(f"[graph] kept {kept} relations")

    return {"nodes": nodes, "links": links}