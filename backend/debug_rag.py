from rag import _get_collection

col = _get_collection()
all_docs = col.get()["documents"]
print("total chunks in store:", len(all_docs))

hits = [d for d in all_docs
        if "Initialization State" in d or "Functional Modes" in d or "FAILSAFE" in d]
print("chunks mentioning the modes:", len(hits))
for h in hits[:3]:
    print("=" * 50)
    print(h)