import json
import os
from openai import OpenAI
from dotenv import load_dotenv
from rag import retrieve

load_dotenv()
client = OpenAI(api_key=os.environ["LLM_API_KEY"], base_url=os.environ["LLM_BASE_URL"])
MODEL = os.environ["LLM_MODEL"]
SYSTEM = "You are a helpful assistant for embedded automotive systems."


def ask(prompt):
    r = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "system", "content": SYSTEM},
                  {"role": "user", "content": prompt}],
    )
    return r.choices[0].message.content.strip()


with open("eval_questions.json", encoding="utf-8") as f:
    questions = json.load(f)

results = []
base_hits = rag_hits = 0
for i, q in enumerate(questions, 1):
    question, gold = q["question"], q["answer_contains"]

    base = ask(question)  # no-RAG: question alone

    chunks = retrieve(question, k=5)  # RAG: retrieve + grounded prompt
    context = "\n\n".join(f"[{c['source']}] {c['text']}" for c in chunks)
    rag = ask(
        "Use the following context to answer the question. Cite the source in brackets. "
        "If the context doesn't cover it, say so.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}"
    )

    b = gold.lower() in base.lower()
    r = gold.lower() in rag.lower()
    base_hits += b
    rag_hits += r
    print(f"Q{i:>2}: no-RAG {'OK' if b else '..'} | RAG {'OK' if r else '..'}  {question[:50]}")
    results.append({"question": question, "gold": gold,
                    "no_rag": base, "rag": rag,
                    "no_rag_correct": b, "rag_correct": r})

with open("eval_answers_output.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

n = len(questions)
print("\n--- Answer accuracy (contains the correct register/term) ---")
print(f"no-RAG: {base_hits}/{n} = {base_hits / n:.0%}")
print(f"RAG:    {rag_hits}/{n} = {rag_hits / n:.0%}")
print("\nFull answers saved to eval_answers_output.json for manual review.")