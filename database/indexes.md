# Database Indexes

This document describes the indexes implemented for the MongoDB database to improve query performance and support efficient data retrieval.

---

## users

| Index | Type | Purpose |
|-------|------|---------|
| email | Unique | Fast user authentication |

---

## workspaces

| Index | Type | Purpose |
|-------|------|---------|
| (user_id, workspace_id) | Unique Compound | Unique workspace per user |
| (user_id, created_at) | Compound | Retrieve workspaces by user |

---

## documents

| Index | Type | Purpose |
|-------|------|---------|
| document_id | Unique | Unique document identifier |
| (workspace_id, status) | Compound | Filter documents by workspace |
| (workspace_id, uploaded_at) | Compound | Retrieve recently uploaded documents |

---

## chunks

| Index | Type | Purpose |
|-------|------|---------|
| chunk_id | Unique | Unique chunk identifier |
| (document_id, page) | Compound | Locate chunks by document and page |
| (workspace_id, chunk_type) | Compound | Filter chunks by type |
| text | Text Index | Keyword search |
| embedding | Vector Search | Semantic search |

---

## metrics

| Index | Type | Purpose |
|-------|------|---------|
| metric_id | Unique | Unique metric identifier |
| (workspace_id, document_id, name) | Compound | Fast metric lookup |
| (document_id, period) | Compound | Period-based queries |

---

## red_flags

| Index | Type | Purpose |
|-------|------|---------|
| flag_id | Unique | Unique red flag identifier |
| (workspace_id, severity) | Compound | Severity filtering |
| (document_id, category) | Compound | Category filtering |
| description | Text Index | Keyword search |

---

## conversations

| Index | Type | Purpose |
|-------|------|---------|
| conversation_id | Unique | Unique conversation identifier |
| (workspace_id, updated_at) | Compound | Retrieve latest conversations |

---

## jobs

| Index | Type | Purpose |
|-------|------|---------|
| job_id | Unique | Unique job identifier |
| (workspace_id, status, created_at) | Compound | Monitor job execution |
| created_at | TTL | Automatically remove old jobs |

---

## audit_logs

| Index | Type | Purpose |
|-------|------|---------|
| timestamp | TTL | Automatic log expiration |
| (correlation_id, timestamp) | Compound | Trace related operations |
| (user_id, timestamp) | Compound | User activity history |

---

## Summary

The database uses unique, compound, text, vector search, and TTL indexes to improve performance, enable semantic search, and automate log retention.
