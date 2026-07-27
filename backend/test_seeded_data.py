"""
test_seeded_data.py — Backend CI/CD Testing Suite for Red Flag Agent
Tests latency, graceful degradation, and schema compliance against seeded MongoDB data.
"""

import os
import time
import unittest
from unittest.mock import patch
import httpx

from app.database import get_db
from app.agents.red_flag_agent import run_red_flag_agent, VALID_CATEGORIES, VALID_SEVERITIES

WORKSPACE_ID = "ws_test_seeded"
DOCUMENT_ID = "doc_test_seeded_001"

class TestRedFlagBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Seed MongoDB with controlled anomalies."""
        cls.db = get_db()
        
        # Clean previous
        cls.db["document_chunks"].delete_many({"document_id": DOCUMENT_ID})
        cls.db["extracted_metrics"].delete_many({"document_id": DOCUMENT_ID})
        cls.db["red_flags"].delete_many({"document_id": DOCUMENT_ID})
        
        # Seed Chunks (Synthetic anomalies)
        chunks = [
            {
                "document_id": DOCUMENT_ID,
                "workspace_id": WORKSPACE_ID,
                "page": 2,
                "text": "The company faces a going concern risk due to a synthetic auditor warning.",
                "embedding": [0.0]*1536
            },
            {
                "document_id": DOCUMENT_ID,
                "workspace_id": WORKSPACE_ID,
                "page": 4,
                "text": "Massive inventory build-ups of 500% were noted in the warehouse, causing severe working capital stress.",
                "embedding": [0.0]*1536
            }
        ]
        cls.db["document_chunks"].insert_many(chunks)
        
        # Seed Metrics
        metrics = {
            "document_id": DOCUMENT_ID,
            "workspace_id": WORKSPACE_ID,
            "metrics": [
                {"name": "debt_to_equity", "value": 2.5, "unit": "x", "page": 5},
                {"name": "dscr", "value": 0.8, "unit": "x", "page": 6}
            ]
        }
        cls.db["extracted_metrics"].insert_one(metrics)
        print("Test data seeded in MongoDB.")

    @classmethod
    def tearDownClass(cls):
        """Clean up MongoDB."""
        cls.db["document_chunks"].delete_many({"document_id": DOCUMENT_ID})
        cls.db["extracted_metrics"].delete_many({"document_id": DOCUMENT_ID})
        cls.db["red_flags"].delete_many({"document_id": DOCUMENT_ID})
        print("Test data cleaned up.")

    def test_01_processing_latency_and_accuracy(self):
        """Verify sub-10-second processing latency per document and high precision."""
        start_time = time.time()
        
        result = run_red_flag_agent(DOCUMENT_ID, WORKSPACE_ID)
        
        duration = time.time() - start_time
        print(f"Agent execution took {duration:.2f} seconds.")
        
        self.assertLess(duration, 10.0, "Agent exceeded sub-10-second latency limit!")
        self.assertEqual(result["status"], "complete")
        
        # Check if it found the seeded risks
        flags = result["red_flags"]
        self.assertGreater(len(flags), 0, "Agent failed to find seeded red flags.")
        
        # Verify it caught the synthetic auditor warning
        found_auditor = any("auditor" in f["description"].lower() for f in flags)
        found_inventory = any("inventory" in f["description"].lower() for f in flags)
        
        self.assertTrue(found_auditor, "Failed to detect synthetic auditor warning.")
        self.assertTrue(found_inventory, "Failed to detect inventory build-up anomaly.")

    def test_02_schema_compliance(self):
        """Enforce strict schema compliance on the MongoDB output."""
        stored = self.db["red_flags"].find_one({"document_id": DOCUMENT_ID})
        self.assertIsNotNone(stored, "Red flags were not stored in MongoDB.")
        
        self.assertEqual(stored["document_id"], DOCUMENT_ID)
        self.assertEqual(stored["workspace_id"], WORKSPACE_ID)
        self.assertIn("scanned_at", stored)
        self.assertIn("status", stored)
        
        # Check flag schema
        for flag in stored["red_flags"]:
            self.assertIn("flag_id", flag)
            self.assertIn("category", flag)
            self.assertIn("severity", flag)
            self.assertIn("description", flag)
            self.assertIn("page", flag)
            self.assertIn("snippet", flag)
            self.assertIn("confidence", flag)
            
            # Enforce enums
            self.assertIn(flag["category"], VALID_CATEGORIES)
            self.assertIn(flag["severity"], VALID_SEVERITIES)
            
            # Enforce types
            self.assertIsInstance(flag["page"], int)
            self.assertIsInstance(flag["confidence"], float)

    @patch("app.agents.red_flag_agent._call_groq_llm")
    def test_03_graceful_degradation_under_api_timeout(self, mock_llm):
        """Test graceful degradation under API timeouts."""
        # Force a timeout error
        mock_llm.side_effect = httpx.ReadTimeout("Simulated Groq API Timeout")
        
        # It should retry (with backoff), so this will take a few seconds
        # Let's patch time.sleep to avoid waiting during CI/CD.
        with patch("app.agents.red_flag_agent.time.sleep", return_value=None):
            result = run_red_flag_agent(DOCUMENT_ID, WORKSPACE_ID)
        
        # Verify it didn't crash, but degraded gracefully
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["flags_count"], 0)
        self.assertIn("Simulated Groq API Timeout", result["error"])
        
        # Verify it saved the failed state to DB
        stored = self.db["red_flags"].find_one({"document_id": DOCUMENT_ID})
        self.assertEqual(stored["status"], "failed")
        self.assertEqual(len(stored["red_flags"]), 0)

if __name__ == "__main__":
    unittest.main(verbosity=2)
