# Database Schema

This document describes the schema of each MongoDB collection used in the Multi-Agent Financial Research System.

---

## users

| Field | Type |
|-------|------|
| _id | ObjectId |
| email | String |
| password_hash | String |
| role | String |
| created_at | Date |
| last_login | Date |

---

## workspaces

| Field | Type |
|-------|------|
| _id | ObjectId |
| workspace_id | String |
| user_id | String |
| name | String |
| document_manifest | Array |
| created_at | Date |

---

## documents

| Field | Type |
|-------|------|
| _id | ObjectId |
| document_id | String |
| workspace_id | String |
| filename | String |
| file_type | String |
| storage_path | String |
| status | String |
| total_pages | Integer |
| uploaded_at | Date |

---

## chunks

| Field | Type |
|-------|------|
| _id | ObjectId |
| chunk_id | String |
| document_id | String |
| workspace_id | String |
| page | Integer |
| section | String |
| chunk_type | String |
| text | String |
| embedding | Array |
| layout_box | Object |
| ocr_confidence | Double |
| created_at | Date |

---

## metrics

| Field | Type |
|-------|------|
| _id | ObjectId |
| metric_id | String |
| document_id | String |
| workspace_id | String |
| name | String |
| value | Number |
| unit | String |
| period | String |
| page | Integer |
| snippet | String |
| confidence | Double |

---

## red_flags

| Field | Type |
|-------|------|
| _id | ObjectId |
| flag_id | String |
| document_id | String |
| workspace_id | String |
| category | String |
| severity | String |
| description | String |
| page | Integer |
| snippet | String |
| confidence | Double |

---

## conversations

| Field | Type |
|-------|------|
| _id | ObjectId |
| conversation_id | String |
| workspace_id | String |
| turns | Array |
| updated_at | Date |

---

## reports

| Field | Type |
|-------|------|
| _id | ObjectId |
| report_id | String |
| workspace_id | String |
| title | String |
| created_at | Date |

---

## jobs

| Field | Type |
|-------|------|
| _id | ObjectId |
| job_id | String |
| workspace_id | String |
| job_type | String |
| status | String |
| payload | Object |
| result | Object |
| error | Object |
| created_at | Date |
| updated_at | Date |

---

## audit_logs

| Field | Type |
|-------|------|
| _id | ObjectId |
| timestamp | Date |
| user_id | String |
| workspace_id | String |
| action | String |
| resource_type | String |
| resource_id | String |
| outcome | String |
| metadata | Object |
| correlation_id | String |

---

## prompts

| Field | Type |
|-------|------|
| _id | ObjectId |
| prompt_id | String |
| name | String |
| version | String |
| template | String |
| created_at | Date |

---

## comparisons

| Field | Type |
|-------|------|
| _id | ObjectId |
| comparison_id | String |
| company_a | String |
| company_b | String |
| workspace_id | String |
| summary | String |
