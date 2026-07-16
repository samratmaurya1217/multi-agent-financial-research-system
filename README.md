# 📈 Velsora — The Multi-Agent Financial Research Platform

[![React](https://img.shields.io/badge/React-18.0+-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![LangGraph](<https://img.shields.io/badge/LangGraph-AI%20Orchestration-orange.svg>)](https://python.langchain.com/docs/langgraph)
[![MongoDB](<https://img.shields.io/badge/MongoDB-Atlas%20Vector%20Search-success.svg>)](https://mongodb.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-yellow.svg)](https://python.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-purple.svg)](https://openai.com/)

**Velsora** is an AI-powered platform where a team of specialized AI agents collaborate to read, analyze, and generate insights from real company financial documents. Designed as a pilot-scale solution, it enforces **strict source grounding** (every insight is traceable to source documents) and features **automatic multi-agent triggering** to streamline the extraction, red-flag detection, comparison, and reporting processes.

---

## 🌟 Key Features

### 📄 Intelligent Document Ingestion & Parsing

- **Multi-Format Support** — Upload financial filings in PDF, DOCX, and TXT formats (up to 50MB).
- **Advanced OCR & Chunking** — Page-boundary aware text extraction with automatic OCR fallback for scanned documents.
- **Semantic Vector Indexing** — Automated embedding generation and vector indexing using MongoDB Atlas Vector Search for precise retrieval.

### 🤖 Multi-Agent Intelligence

- **6 Specialized Agents** — Document, Extraction, Red Flag, Comparison, Research, and Report Agents.
- **Metric Extraction Engine** — Automatically pulls revenue, EBITDA, EPS, and other key ratios with exact source citations.
- **Red Flag Classifier** — Detects and categorizes risks (Liquidity, Profitability, Governance) with low-to-critical severity levels.
- **Conversational Research Assistant** — Answers multi-part queries with step-by-step reasoning, RAG context, and strict grounding validation.
- **Automated Report Generation** — Compiles cross-agent analytics into structured, analyst-style PDF reports.

### ⚙️ Orchestration & State Management

- **Event-Driven Pipelines** — Pipeline triggers automatically upon document upload without blocking the UI.
- **Durable Handoffs** — Stateful LangGraph orchestrator ensures intermediate agent outputs are persisted in MongoDB.
- **Fault Tolerance & Recovery** — Bounded retry policies, exponential backoff, and graceful degradation strategies for LLM timeouts.
- **Tool Registry Access** — Agents are restricted to specific capability-based tools (e.g., `vector_search`, `pdf_parse`, `schema_validate`).

### 🔒 Security, Trust & Grounding

- **Strict Source Grounding** — The system guarantees every insight is backed by a specific page/chunk in the source documents.
- **Zero-Tolerance Hallucination Checks** — The Research Agent refuses to answer if relevant source material is unavailable.
- **Prompt Injection Defense** — Rigorous input validation before expensive LLM calls.
- **Role-Based Access Control** — Secure workspaces managed via JWT authentication for Admins, Analysts, and Viewers.

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (React 18 + TS)"]
        UI["Workspace / Dashboard"]
        UP["Upload & Ingestion"]
        CH["Conversational Chat"]
        REP["Report Viewer"]
    end

    subgraph Backend["Backend (FastAPI)"]
        SRV["API Gateway (REST + SSE)"]

        subgraph AI["AI Engine (LangGraph)"]
            ORC["Orchestrator"]
            AGT["Agents (6 Roles)"]
            OAI["LLM Provider (OpenAI/Anthropic)"]
            TL["Tool Registry"]
        end

        subgraph Core["Core Services"]
            AUTH["JWT Auth & RBAC"]
            VAL["Validation & Injection Defense"]
        end
    end

    subgraph Storage["Data Layer"]
        MDB[("MongoDB (State, Users)")]
        VDB[("Atlas Vector Search")]
        OBJ["Object Storage (S3/MinIO)"]
        RED["Redis (Queue/Cache)"]
    end

    UI --> SRV
    UP --> SRV
    CH --> SRV
    REP --> SRV

    SRV --> ORC
    SRV --> AUTH
    SRV --> VAL
  
    ORC --> AGT
    AGT --> OAI
    AGT --> TL
  
    SRV --> RED
    RED --> ORC
  
    ORC --> MDB
    AGT --> MDB
    AGT --> VDB
    UP --> OBJ
```

---

## 🧠 AI Architecture

The AI architecture strictly enforces separation of concerns. Instead of a single monolithic prompt, tasks are delegated to a set of specialized, highly cohesive agents.

```mermaid
flowchart LR
    subgraph Pipeline["Automated Ingestion Pipeline"]
        A1[Document Agent] -->|Parses & Indexes| A2[Extraction Agent]
        A2 -->|Extracts Metrics| A3[Red Flag Agent]
    end
  
    subgraph AdHoc["Ad-Hoc / User-Triggered"]
        B1[Comparison Agent]
        B2[Research Agent]
    end
  
    subgraph Export["Output Pipeline"]
        C1[Report Agent]
    end

    A1 -.-> C1
    A2 -.-> C1
    A3 -.-> C1
    B1 -.-> C1
```

---

## ⚙️ AI Orchestration

Agent orchestration relies on stateful graphs to manage durable handoffs, retries, and graceful degradations. Each handoff is persisted via the database.

```mermaid
stateDiagram-v2
    [*] --> IngestionTriggered
    IngestionTriggered --> DocumentAgent
  
    DocumentAgent --> ExtractionAgent : Document Parsed & Indexed
    DocumentAgent --> Failed : Parsing Error
  
    ExtractionAgent --> RedFlagAgent : Metrics Persisted
    ExtractionAgent --> RedFlagAgent : Partial Failure (Degraded)
  
    RedFlagAgent --> PipelineComplete : Flags Detected & Persisted
  
    PipelineComplete --> [*]
    Failed --> [*]
  
    state ExtractionAgent {
        [*] --> ExtractMetrics
        ExtractMetrics --> ValidateCitations
        ValidateCitations --> [*] : Pass
        ValidateCitations --> ExtractMetrics : Retry (Max 3)
    }
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** (Backend API & Workers)
- **Node.js 18+** (Frontend React App)
- **MongoDB** (State and Vector Database)
- **Redis** (Optional: for Celery async queue management)
- API Keys for your preferred LLM provider (OpenAI / Anthropic)

---

## 🔗 Links

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?logo=github)](https://github.com/samratmaurya1217/multi-agent-financial-research-system)

---

*Built with ❤️ to revolutionize autonomous financial intelligence.*
