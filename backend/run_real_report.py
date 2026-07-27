"""
run_real_report.py — End-to-end pipeline on RIIL Annual Report
"""
import json
from app.agents.document_agent import process_and_index_document
from app.agents.extraction_agent import run_extraction_agent
from app.agents.red_flag_agent import run_red_flag_agent

def main():
    workspace_id = "ws_riil_test"
    document_id = "doc_riil_annual_report"
    filepath = r"uploaded_filings\riil_annual_report.pdf"
    filename = "Annual-Report-2025-26.pdf"
    
    print("=========================================")
    print("1. Running Document Agent")
    print("=========================================")
    try:
        doc_res = process_and_index_document(filepath, workspace_id, document_id, filename)
        print(f"Parsed {doc_res['total_pages']} pages into {doc_res['total_chunks']} chunks.")
    except Exception as e:
        print(f"Error in Document Agent: {e}")
        return

    print("\n=========================================")
    print("2. Running Extraction Agent")
    print("=========================================")
    try:
        ext_res = run_extraction_agent(document_id, workspace_id)
        metrics = ext_res.get("metrics", [])
        print(f"Extracted {len(metrics)} quantitative metrics:")
        for m in metrics:
            print(f" - {m['name']}: {m['value']} {m.get('unit','')} (Page {m['page']})")
    except Exception as e:
        print(f"Error in Extraction Agent: {e}")
        return

    print("\n=========================================")
    print("3. Running Red Flag Agent")
    print("=========================================")
    try:
        rf_res = run_red_flag_agent(document_id, workspace_id)
        flags = rf_res.get("red_flags", [])
        print(f"Found {len(flags)} distinct, consolidated red flags:")
        
        output_json = []
        for f in flags:
            print(f"\n[{f['severity'].upper()}] {f['category']} (Confidence: {f['confidence']})")
            print(f"Reason: {f['description']}")
            print(f"Page: {f['page']}")
            
            output_json.append({
                "Category": f['category'],
                "Severity": f['severity'],
                "Confidence": f"{f['confidence']*100:.1f}%",
                "Reason": f['description'],
                "Page": f['page']
            })
            
        with open("riil_results.json", "w") as outf:
            json.dump({"Metrics": metrics, "RedFlags": output_json}, outf, indent=4)
        print("\nResults saved to riil_results.json")
        
    except Exception as e:
        print(f"Error in Red Flag Agent: {e}")

if __name__ == "__main__":
    main()
