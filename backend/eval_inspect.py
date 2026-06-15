import json
from rag import retrieve

TARGET = "open-circuit fault"  # change this to a snippet of the miss you want to inspect

with open("eval_questions.json", encoding="utf-8") as f:
    questions = json.load(f)

q = next(x for x in questions if TARGET.lower() in x["question"].lower())
print("Q:", q["question"])
print("looking for:", q["answer_contains"])
print("=" * 60)
for i, r in enumerate(retrieve(q["question"], k=5), 1):
    print(f"\n--- chunk #{i} [{r['source']}] ---")
    print(r["text"][:400])