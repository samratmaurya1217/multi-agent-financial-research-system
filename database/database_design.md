# Database Design

## Database Overview

The Multi-Agent Financial Research System uses **MongoDB Atlas** as its primary database to store structured and unstructured financial research data.

- **Database Name:** financial_research_db
- **Database Platform:** MongoDB Atlas
- **Cluster Name:** FinanceCluster

---

# Collections

| Collection | Purpose |
|------------|---------|
| users | Stores user accounts and roles |
| workspaces | Stores research workspace information |
| documents | Stores uploaded financial reports |
| chunks | Stores document chunks for retrieval and vector search |
| metrics | Stores extracted financial metrics |
| red_flags | Stores detected financial risks |
| conversations | Stores AI-user conversations |
| reports | Stores generated financial reports |
| jobs | Tracks asynchronous processing jobs |
| audit_logs | Stores audit and activity logs |
| prompts | Stores AI prompt templates |
| comparisons | Stores company comparison results |

---

# Relationships

- One **User** can own multiple **Workspaces**.
- One **Workspace** can contain multiple **Documents**.
- One **Document** can contain multiple **Chunks**.
- One **Document** can produce multiple **Metrics**.
- One **Document** can generate multiple **Red Flags**.
- One **Workspace** can contain multiple **Reports**.
- One **Workspace** can contain multiple **Conversations**.

---

# Technologies Used

- MongoDB Atlas
- JSON Schema Validation
- Compound Indexes
- Unique Indexes
- Text Search Index
- Vector Search Index
- TTL Indexes

---

# Seed Data

The database includes sample seed data derived from:

- Apple Inc. Annual Report (2025)
- Microsoft Corporation Annual Report (2025)
- Tesla Inc. Annual Report (2025)
