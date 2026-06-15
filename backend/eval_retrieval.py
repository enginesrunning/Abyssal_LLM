import json
from rag import retrieve

with open("eval_questions.json", encoding="utf-8") as f:
    questions = json.load(f)

KS = [1, 3, 5, 10, 20, 30] #was prev 1, 3, 5, 10
hits = {k: 0 for k in KS}

for q in questions:
    needle = q["answer_contains"].lower()
    results = retrieve(q["question"], k=max(KS))
    rank = next((i + 1 for i, r in enumerate(results) if needle in r["text"].lower()), None)
    for k in KS:
        if rank is not None and rank <= k:
            hits[k] += 1
    print(f"[{'hit@' + str(rank) if rank else '  MISS':>7}] {q['question'][:60]}")

n = len(questions)
print("\n--- Retrieval hit rate ---")
for k in KS:
    print(f"hit@{k}: {hits[k]}/{n} = {hits[k] / n:.0%}")