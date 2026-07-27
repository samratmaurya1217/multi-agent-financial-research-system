"""
validate_rf.py — Validation Script for Red Flag Agent
Runs the agent, checks against Ground Truth, calculates Precision/Recall, and saves to JSON.
"""

import json
from app.agents.red_flag_agent import run_red_flag_agent
from app.database import get_db

WORKSPACE_ID = "ws_O3RqiuXv"
DOCUMENT_ID = "doc_zenith_rf"

GROUND_TRUTH = {
    "Debt ↑163%": ["debt", "borrowing", "leverage", "163.33%"],
    "DSCR ↓64.94%": ["dscr", "64.94%", "debt service"],
    "Auditor Qualification": ["auditor", "qualification", "qualified"],
    "Inventory Weakness": ["inventory", "working capital", "receivable"],
    "Related Party Risk": ["related party", "zenith global", "related-party"]
}

def validate():
    print("Running Red Flag Agent (LLM Only)...")
    db = get_db()
    
    # Run the agent (relies on extraction metrics already being in DB from previous tests)
    result = run_red_flag_agent(DOCUMENT_ID, WORKSPACE_ID)
    
    found_flags = result.get("red_flags", [])
    print(f"Agent found {len(found_flags)} red flags.")

    matched_gt = set()
    output_json_list = []
    
    false_positives = 0
    
    for flag in found_flags:
        desc = flag.get("description", "").lower()
        trigger = flag.get("trigger", "").lower()
        snippet = flag.get("snippet", "").lower()
        
        combined_text = f"{desc} {trigger} {snippet}"
        
        # Find ALL ground truth items this flag covers
        matched_categories_for_flag = []
        for gt_name, keywords in GROUND_TRUTH.items():
            if any(kw.lower() in combined_text for kw in keywords):
                matched_categories_for_flag.append(gt_name)
                matched_gt.add(gt_name)
                
        if matched_categories_for_flag:
            status = f"Validated (True Positive for: {', '.join(matched_categories_for_flag)})"
        else:
            status = "False Positive (Not in Ground Truth)"
            false_positives += 1
            
        output_json_list.append({
            "Red Flag Output": flag.get("category") + " - " + flag.get("trigger", "Risk"),
            "Confidence": f"{flag.get('confidence', 0) * 100:.0f}%",
            "Page": flag.get("page"),
            "Reason": flag.get("description"),
            "Status": status
        })
        
    true_positives = len(matched_gt)
    false_negatives = len(GROUND_TRUTH) - true_positives
    
    # Calculate precision based on the number of valid flags vs total flags
    valid_flags_count = len(found_flags) - false_positives
    precision = valid_flags_count / len(found_flags) if len(found_flags) > 0 else 0
    recall = true_positives / len(GROUND_TRUTH) if len(GROUND_TRUTH) > 0 else 0
    
    # Add missed ground truths
    for gt_name in GROUND_TRUTH.keys():
        if gt_name not in matched_gt:
            output_json_list.append({
                "Red Flag Output": gt_name,
                "Confidence": "0%",
                "Page": "N/A",
                "Reason": "Missed by LLM",
                "Status": "False Negative (Missed)"
            })
            
    # Add summary
    output_json_list.append({
        "EVALUATION_SUMMARY": {
            "True Positives": true_positives,
            "False Positives": false_positives,
            "False Negatives": false_negatives,
            "Precision": f"{precision * 100:.1f}%",
            "Recall": f"{recall * 100:.1f}%"
        }
    })
    
    with open("red_flag_validation.json", "w") as f:
        json.dump(output_json_list, f, indent=4)
        
    print(f"Validation complete. Precision: {precision*100:.1f}%, Recall: {recall*100:.1f}%")
    print("Results saved to red_flag_validation.json")

if __name__ == "__main__":
    validate()
