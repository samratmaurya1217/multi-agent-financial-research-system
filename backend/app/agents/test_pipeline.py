"""
test_pipeline.py — Unit test for LangGraph Multi-Agent Pipeline and MongoDB Atlas Vector Storage.

Run: python -m app.agents.test_pipeline
"""

import os
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=False)

from app.agents.pipeline import (
    run_research_pipeline,
    search_similar_chunks,
    get_embedding_model
)

def test_pipeline():
    print("==================================================")
    print("Testing LangGraph Multi-Agent Pipeline & Vector Engine")
    print("==================================================")

    # 1. Test Embedding Model Loading
    print("\n[1] Testing SentenceTransformer embedding model...")
    model = get_embedding_model()
    vec = model.encode("Apple Inc net sales FY2024").tolist()
    print(f"  Embedding dimension: {len(vec)} (expected 384)")
    assert len(vec) == 384, "Embedding length should be 384"
    print("  [SUCCESS] Embedding model functional.")

    # 2. Test Similarity Search
    print("\n[2] Testing Vector Search against MongoDB Atlas...")
    test_ws = "ws_apple2024"
    chunks = search_similar_chunks(test_ws, "What was Apple revenue and sales?", top_k=2)
    print(f"  Retrieved {len(chunks)} chunks for workspace '{test_ws}'.")
    for i, c in enumerate(chunks, 1):
        print(f"   Chunk {i}: Doc={c['filename']}, Page={c['page']}, Score={c['score']}")
    print("  [SUCCESS] Vector Search query execution successful.")

    # 3. Test Full LangGraph Multi-Agent Execution
    print("\n[3] Invoking compiled LangGraph StateGraph Workflow...")
    res = run_research_pipeline(workspace_id=test_ws, query="Summarize Apple revenue growth and risk factors")
    print(f"  Graph Status: COMPLETED")
    print(f"  Agent Traces ({len(res['agent_traces'])} nodes executed):")
    for trace in res["agent_traces"]:
        print(f"    - {trace['agent']}: {trace['status']}")
    print(f"  Citations Generated: {len(res['citations'])}")
    print("\nSynthesized Response Sample:")
    print("-" * 50)
    print(res["response"][:400] + "...")
    print("-" * 50)
    print("  [SUCCESS] LangGraph Workflow Execution Complete!")

if __name__ == "__main__":
    test_pipeline()
