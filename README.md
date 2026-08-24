# 📈 Velsora — Multi-Agent Financial Research System

[![React](https://img.shields.io/badge/React-18.0+-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-AI%20Orchestration-FF6B6B)](https://python.langchain.com/docs/langgraph)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20Vector%20Search-47A248?logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Velsora** is an autonomous multi-agent financial intelligence and research platform engineered to ingest, parse, extract, evaluate, compare, and generate analyst-grade insights from corporate financial filings (10-K, 10-Q, 8-K, Annual Reports, and Earnings Transcripts). 

By combining **LangGraph-driven multi-agent orchestration**, **MongoDB Atlas Vector Search**, and **strict source grounding**, Velsora eliminates LLM hallucinations, enforces deterministic financial sanity checks, and automates end-to-end investment research workflows.

---

## 📑 Table of Contents

- [Core Value Proposition](#-core-value-proposition)
- [System Architecture](#-system-architecture)
- [Multi-Agent Intelligence Network](#-multi-agent-intelligence-network)
- [Key Features](#-key-features)
- [Project Directory Structure](#-project-directory-structure)
- [API Reference](#-api-reference)
- [Security & Grounding Architecture](#-security--grounding-architecture)
- [Getting Started & Installation](#-getting-started--installation)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
  - [Database & Vector Index Setup](#3-mongodb-atlas-configuration)
- [Environment Configuration Reference](#-environment-configuration-reference)

---

## 💡 Core Value Proposition

Financial analysis demands precision, transparency, and strict accountability. Standard general-purpose LLMs struggle with hallucinations, arithmetic errors, and vague source references. 

Velsora solves these limitations through:
1. **Strict Source Grounding** — Every metric, ratio, risk, and qualitative answer is linked directly to a verifiable document chunk and page number.
2. **Hybrid RAG & Vector Search** — Combines dense semantic vector embeddings (`all-MiniLM-L6-v2`, 384-dim) with lexical keyword matching (BM25) inside MongoDB Atlas.
3. **Deterministic Financial Verification** — Validates balance sheet formulas, cash flow reconciliations, and ratio boundaries with Python math rules prior to LLM reasoning.
4. **Resilient Multi-Agent Pipelines** — Dedicated autonomous agents execute specialized tasks with durable MongoDB state handoffs and retry mechanisms.
5. **Analyst-Ready Reporting** — Generates structured executive PDF reports with automated balance sheet tables, risk matrices, and comparison sidebars.

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph Client["Frontend Client (React 18 + TypeScript + Vite)"]
        UI["Workspace Dashboard"]
        UP["Document Ingestion Center"]
        CH["Streaming Research Assistant (SSE)"]
        CMP["Side-by-Side Comparison Engine"]
        REP["Audit Report Viewer & PDF Exporter"]
    end

    subgraph Backend["Backend Gateway (FastAPI ASGI)"]
        ROUTERS["API Endpoints (/auth, /documents, /research, /comparisons, /reports)"]
        AUTH_MW["JWT (HS256) & Firebase (RS256) Auth"]
        VAL_GUARD["Prompt Injection Defense & Input Sanitizer"]
        
        subgraph Orchestration["Agent Execution Engine (LangGraph)"]
            GRAPH["StateGraph Orchestrator"]
            A_DOC["Document Ingestion Agent"]
            A_EXT["Metric Extraction Agent"]
            A_RED["Forensic Red Flag Agent"]
            A_CMP["Peer Comparison Agent"]
            A_RES["Conversational Research Agent"]
            A_RPT["Executive Report Agent"]
        end

        subgraph LLM_Gateway["Provider-Agnostic LLM Layer"]
            ROUTER_LLM["LLM Gateway / Router"]
            OAI["NVIDIA Nemotron 3 Ultra (Primary)"]
            GEM["Google Gemini 2.5 (Fallback 1)"]
            GRQ["Groq LLaMA 3.3 (Fallback 2)"]
        end
    end

    subgraph Data["Persistence Layer (MongoDB Atlas)"]
        MDB_DOCS[("documents & document_chunks")]
        MDB_VECTOR[("Atlas Vector Search (384-dim)")]
        MDB_STATE[("workspaces & users")]
        MDB_KNOW[("extracted_metrics & red_flags")]
        MDB_OUT[("conversations, comparisons & reports")]
    end

    UI --> ROUTERS
    UP --> ROUTERS
    CH --> ROUTERS
    CMP --> ROUTERS
    REP --> ROUTERS

    ROUTERS --> AUTH_MW
    AUTH_MW --> VAL_GUARD
    VAL_GUARD --> GRAPH

    GRAPH --> A_DOC
    GRAPH --> A_EXT
    GRAPH --> A_RED
    GRAPH --> A_CMP
    GRAPH --> A_RES
    GRAPH --> A_RPT

    A_DOC --> MDB_DOCS
    A_DOC --> MDB_VECTOR
    A_EXT --> MDB_KNOW
    A_RED --> MDB_KNOW
    A_CMP --> MDB_OUT
    A_RES --> MDB_OUT
    A_RPT --> MDB_OUT

    A_DOC & A_EXT & A_RED & A_CMP & A_RES & A_RPT --> ROUTER_LLM
    ROUTER_LLM --> OAI
    ROUTER_LLM --> GEM
    ROUTER_LLM --> GRQ

    A_RES --> MDB_VECTOR
    GRAPH --> MDB_STATE
```

---

## 🤖 Multi-Agent Intelligence Network

Velsora divides complex financial analysis across six purpose-built agents to ensure separation of concerns, high domain accuracy, and auditability:

```mermaid
flowchart LR
    subgraph Ingestion["1. Automated Pipeline (On Upload)"]
        A1["📄 Document Agent<br/>• Layout Parsing<br/>• Sliding-Window Chunking<br/>• Vector Indexing"] 
        --> A2["📊 Extraction Agent<br/>• Revenue, EBITDA, EPS<br/>• Balance Sheet Ratios<br/>• Citation Grounding"]
        --> A3["🚩 Red Flag Agent<br/>• Deterministic Scans<br/>• Forensic Risk Detection<br/>• Severity Scoring"]
    end

    subgraph OnDemand["2. Interactive & Analytical Engines"]
        B1["⚖️ Comparison Agent<br/>• Multi-Company Peers<br/>• Delta Calculations<br/>• Variance Synthesis"]
        B2["💬 Research Agent<br/>• Hybrid RAG QA<br/>• Real-time SSE Stream<br/>• Citation Pill Delivery"]
    end

    subgraph Output["3. Executive Delivery"]
        C1["📑 Report Agent<br/>• Multi-Section Synthesis<br/>• PDF Compilation<br/>• Audit Trail Export"]
    end

    A3 -.-> B1
    A3 -.-> B2
    A3 -.-> C1
    B1 -.-> C1
```

### Agent Breakdown

| Agent | Core Responsibilities | Key Technologies & Output |
| :--- | :--- | :--- |
| **📄 Document Agent** | Ingests PDF, DOCX, TXT filings; performs text normalization, structural token chunking (500-token windows with 100-token overlap), and generates 384-dim dense embeddings. | `pypdf`, `sentence-transformers` (`all-MiniLM-L6-v2`), MongoDB `document_chunks` collection. |
| **📊 Extraction Agent** | Identifies standard GAAP/IFRS line items (Revenue, Net Income, Gross Margin, Operating Margin, Debt-to-Equity, Free Cash Flow, Current Ratio) and attaches exact page/chunk coordinates. | Structured JSON schemas, regex pre-filters, LLM structured extraction, MongoDB `extracted_metrics`. |
| **🚩 Red Flag Agent** | 7-stage forensic risk pipeline: deterministic balance sheet sanity checks, domain-segmented semantic retrieval, candidate generation, adversarial recall passes, and precision verification across 5 risk domains. | Severity classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), confidence metrics, MongoDB `red_flags`. |
| **⚖️ Comparison Agent** | Performs automated side-by-side benchmarking across multiple corporate filings or fiscal periods, calculating absolute and percentage variances for margins, liquidity, and growth. | Normalized financial comparison matrices, executive comparative summaries, MongoDB `comparisons`. |
| **💬 Research Agent** | Multi-turn conversational research assistant answering open-ended financial questions with hybrid RAG retrieval, zero-hallucination guardrails, and real-time Server-Sent Events (SSE) streaming. | Streaming SSE tokens, interactive citation chips (`[DocID, Page N]`), conversation memory. |
| **📑 Report Agent** | Aggregates all extracted metrics, detected red flags, comparative insights, and strategic commentary into formal, publication-ready research reports. | ReportLab PDF compilation, executive summary generation, MongoDB `reports`. |

---

## 🌟 Key Features

### 1. Document Ingestion & Vector Indexing
- Supports standard financial filings in PDF, DOCX, and TXT format (up to 50MB per document).
- Automatic text cleanup and page-aware chunking preserving tabular alignment and section headings.
- Real-time indexing into MongoDB Atlas with cosine vector similarity search.

### 2. Forensic Red Flag Detection
- Multi-category risk monitoring:
  - **Liquidity & Solvency** (Declining current ratio, debt maturity cliffs, interest coverage drops).
  - **Profitability & Margins** (Gross margin compression, divergence between net income and operating cash flow).
  - **Governance & Legal** (Ongoing litigation, regulatory scrutiny, material weakness in internal controls).
  - **Operational & Supply Chain** (Customer concentration, supply chain disruptions, inventory build-ups).
  - **Market & Competitive** (Pricing pressure, market share erosion, FX volatility).

### 3. Conversational Financial Assistant
- Real-time streaming responses with Time-to-First-Token (TTFT) under 500ms.
- Clickable citation badges in chat messages linking directly to source document excerpts.
- Strict refusal logic: if relevant financial data is not present in the ingested filings, the assistant explicitly states the limitation rather than hallucinating numbers.

### 4. Interactive Peer Comparison
- Select two or more corporate filings to generate immediate side-by-side financial comparison tables.
- Automatic delta calculation for key performance indicators (KPIs) and growth metrics.
- AI-synthesized narrative comparing operational strengths and risks between companies.

### 5. Instant PDF Audit Report Generation
- One-click compilation of workspace analytics into styled, professional PDF reports.
- Embedded data tables, structured risk assessment summaries, and citation references.
- In-browser preview and direct binary file download.

---

## 📁 Project Directory Structure

```text
MAFRS/
├── .gitignore                         # Comprehensive secret, temp & build exclusion rules
├── README.md                          # Full system documentation
├── backend/
│   ├── .env.example                   # Backend environment configuration template
│   ├── requirements.txt               # Backend Python dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── auth.py                    # JWT (HS256), Bcrypt hashing & Firebase RS256 token verification
│   │   ├── database.py                # MongoDB Atlas connection, indexes & collection accessors
│   │   ├── main.py                    # FastAPI ASGI application & REST/SSE endpoint routers
│   │   └── agents/
│   │       ├── __init__.py
│   │       ├── comparison_agent.py    # Multi-filing financial comparison engine
│   │       ├── document_agent.py      # PDF/DOCX parser, chunker & 384-dim embedder
│   │       ├── extraction_agent.py    # Financial line-item & ratio extraction engine
│   │       ├── llm_client.py          # Unified LLM client with OpenRouter, Gemini & Groq fallback
│   │       ├── pipeline.py            # LangGraph multi-agent orchestration pipeline
│   │       ├── rag.py                 # Hybrid vector + lexical retrieval engine
│   │       ├── red_flag_agent.py      # 7-stage forensic risk detection engine
│   │       ├── report_agent.py        # ReportLab PDF compiler & summary generator
│   │       └── research_agent.py      # Conversational hybrid RAG assistant with SSE streaming
│   └── scripts/                       # Presentation & operational utility scripts
├── database/
│   ├── README.md                      # Database architecture documentation
│   ├── database_design.md             # Collection schemas & relational mapping
│   ├── indexes.md                     # MongoDB compound and vector search index definitions
│   ├── schema.md                      # JSON document schema specifications
│   └── setup.md                       # Atlas setup and collection bootstrap instructions
└── frontend/
    ├── .env.example                   # Frontend environment configuration template
    ├── package.json                   # Frontend npm dependencies and scripts
    ├── tsconfig.json                  # TypeScript compiler configuration
    ├── vite.config.ts                 # Vite bundler configuration
    ├── public/                        # Static assets and icons
    └── src/
        ├── App.tsx                    # React router & global route definitions
        ├── main.tsx                   # React 18 DOM entrypoint
        ├── index.css                  # Global styles, Tailwind CSS & custom design tokens
        ├── components/                # Shared UI components (CitationChip, Sidebar, StatCards, etc.)
        ├── layouts/                   # DashboardLayout & AuthLayout wrappers
        ├── pages/                     # Application pages (Dashboard, Chat, Comparison, Upload, Reports, Settings)
        ├── services/                  # Frontend API service layer (Axios & SSE client)
        └── store/                     # Context providers (AuthStore, ThemeStore)
```

---

## 🔌 API Reference

### Authentication & User Management
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new user account with email, name, and password. | No |
| `POST` | `/auth/login` | Authenticate with credentials and receive a signed HS256 JWT access token. | No |
| `POST` | `/auth/firebase` | Authenticate using a Google Firebase OAuth ID token. | No |
| `GET` | `/auth/me` | Fetch profile information and assigned workspace for the current user. | Yes (Bearer) |

### Workspaces
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/workspaces` | List all workspaces accessible by the authenticated user. | Yes (Bearer) |
| `POST` | `/workspaces` | Create a new isolated financial analysis workspace. | Yes (Bearer) |
| `GET` | `/workspaces/{workspace_id}` | Retrieve details and document manifests for a specific workspace. | Yes (Bearer) |
| `DELETE` | `/workspaces/{workspace_id}` | Delete a workspace and its associated documents, metrics, and reports. | Yes (Bearer) |

### Document Ingestion & Extractions
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/documents/upload` | Upload a financial document (PDF/DOCX/TXT) and trigger autonomous ingestion. | Yes (Bearer) |
| `GET` | `/documents` | List all indexed documents in the active workspace. | Yes (Bearer) |
| `GET` | `/documents/{document_id}/extraction` | Get extracted financial metrics and balance sheet items for a document. | Yes (Bearer) |
| `GET` | `/documents/{document_id}/red_flags` | Retrieve detected forensic red flags and risk classifications. | Yes (Bearer) |
| `DELETE` | `/documents/{document_id}` | Remove a document, vector chunks, metrics, and red flags from the database. | Yes (Bearer) |

### Conversational Research Assistant
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/research/query` | Submit a financial query and receive a grounded JSON response with citations. | Yes (Bearer) |
| `POST` | `/research/stream` | Stream research answers in real time using Server-Sent Events (SSE). | Yes (Bearer) |
| `GET` | `/research/history` | Retrieve past conversational turns and research threads for the workspace. | Yes (Bearer) |

### Comparison Engine
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/comparisons` | Trigger multi-document / peer comparison analysis across selected filings. | Yes (Bearer) |
| `GET` | `/comparisons` | List all persisted comparison reports for the workspace. | Yes (Bearer) |
| `GET` | `/comparisons/{comparison_id}` | Retrieve full details and matrix data for a specific comparison run. | Yes (Bearer) |

### Executive Reports
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/reports/generate` | Compile extraction metrics, red flags, and commentary into an audit report. | Yes (Bearer) |
| `GET` | `/reports` | List all generated research reports in the workspace. | Yes (Bearer) |
| `GET` | `/reports/{report_id}/status` | Check compilation status of a generated report. | Yes (Bearer) |
| `GET` | `/reports/{report_id}/pdf` | Stream binary PDF content directly to browser viewer. | Yes (Bearer / Query) |
| `GET` | `/reports/{report_id}/download` | Download compiled PDF report file. | Yes (Bearer / Query) |

### System Health
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Verify database connectivity and server status. | No |
| `GET` | `/` | Root status and API metadata. | No |

---

## 🔒 Security & Grounding Architecture

### 1. Multi-Tenant Workspace Isolation
Every database query strictly enforces workspace boundary checks. Documents, vector chunks, extraction metrics, red flags, conversations, and reports are partitioned by `workspace_id`. Cross-workspace data leakage is blocked at the authentication and database service layers.

### 2. Dual Authentication Gateway
- **Native JWTs**: Securely signed with HS256, strictly validated expiration timestamps, and password hashing powered by Bcrypt with automatic salt generation.
- **Firebase OAuth Integration**: RS256 token decoding against Google's public x509 certificate authority for secure single sign-on.

### 3. Strict Source Grounding & Anti-Hallucination
- All metrics and red flags are linked to verified text snippets and page numbers.
- Research assistant queries execute hybrid vector retrieval; if the similarity score is below the minimum threshold or if evidence is absent, the agent refuses to speculate.

### 4. Zero Credential Exposure
- Internal chain-of-thought tokens and system prompt templates are filtered out before sending responses to the client.
- All secrets, API keys, and database URIs are managed through environment variables and strictly excluded via `.gitignore`.

---

## 🚀 Getting Started & Installation

### Prerequisites
- **Python 3.10+** (64-bit)
- **Node.js 18+** & **npm**
- **MongoDB Atlas** cluster (with Vector Search index configured)
- An **OpenRouter**, **Google Gemini**, or **Groq** API key

---

### 1. Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   # On Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # On Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   *Edit `backend/.env` with your MongoDB URI, JWT secret, and LLM API keys.*

5. **Start the FastAPI backend server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The backend API will be available at `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).

---

### 2. Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   *Verify `VITE_API_URL=http://localhost:8000` inside `frontend/.env`.*

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   The frontend application will be available at `http://localhost:5173`.

---

### 3. MongoDB Atlas Configuration

1. In MongoDB Atlas, create a database named `velsora`.
2. Collections are automatically initialized on startup with required indexes:
   - `users`, `workspaces`, `documents`, `document_chunks`, `extracted_metrics`, `red_flags`, `conversations`, `comparisons`, `reports`, `jobs`, `audit_logs`.
3. To enable hybrid RAG vector search, configure a Vector Index on the `document_chunks` collection:
   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": 384,
         "similarity": "cosine"
       },
       {
         "type": "filter",
         "path": "workspace_id"
       },
       {
         "type": "filter",
         "path": "document_id"
       }
     ]
   }
   ```

---

## ⚙️ Environment Configuration Reference

### Backend (`backend/.env`)

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `MONGO_URI` | **Yes** | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/?appName=velsora` |
| `MONGO_DB_NAME` | No | Database name | `velsora` (default) |
| `JWT_SECRET` | **Yes** | 256-bit secret key for signing JWTs | `a_strong_random_secret_string` |
| `JWT_EXPIRE_HOURS` | No | JWT access token validity in hours | `72` (default) |
| `OPENROUTER_API_KEY` | Optional | OpenRouter API Key (for NVIDIA Nemotron) | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | No | Model slug on OpenRouter | `nvidia/nemotron-3-ultra-550b-a55b` |
| `GEMINI_API_KEY` | Optional | Google Gemini API Key (Fallback 1) | `AIzaSy...` |
| `GROQ_API_KEY` | Optional | Groq API Key (Fallback 2) | `gsk_...` |
| `FIREBASE_PROJECT_ID` | Optional | Firebase Project ID for token validation | `velsora-29767` |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Yes** | Backend FastAPI server endpoint | `http://localhost:8000` |
| `VITE_FIREBASE_API_KEY` | Optional | Firebase Web Client API key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Optional | Firebase Auth Domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Optional | Firebase Project ID | `project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET`| Optional | Firebase Storage Bucket | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Optional | Firebase Messaging Sender ID | `1234567890` |
| `VITE_FIREBASE_APP_ID` | Optional | Firebase Web App ID | `1:123:web:abc` |

---

## 👥 Authors & Acknowledgments

- **Samrat Maurya** ([@samratmaurya1217](https://github.com/samratmaurya1217))
- **Team 2** — Infosys Springboard Virtual Internship 7.0

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for the full text.

SPDX-License-Identifier: `MIT`

Copyright (c) 2026 Samrat Maurya and Velsora Contributors

> **Note on third-party dependencies**: This project depends on third-party packages that carry their own licenses (FastAPI/MIT, LangChain/MIT, PyMuPDF/AGPL-3.0, sentence-transformers/Apache-2.0, etc.). The MIT license in this repository applies exclusively to the original source code authored by the Velsora contributors. Dependency licenses are unaffected and remain intact within their respective distribution packages.

---

*Built for robust, verifiable, and explainable autonomous financial intelligence.*
