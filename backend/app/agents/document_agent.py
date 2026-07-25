import fitz 
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import DeterministicFakeEmbedding
from langchain_chroma import Chroma

class DocumentAgent:
    def __init__(self, db_path: str = "./chroma_db"):
        self.db_path = db_path
        self.embeddings = DeterministicFakeEmbedding(size=384)

    def extract_text_with_page_metadata(self, pdf_path: str):
        """Extracts text while maintaining strict page boundaries for citations"""
        doc = fitz.open(pdf_path)
        pages = []
        for page_idx, page in enumerate(doc):
            text = page.get_text("text")
            if text.strip():
                pages.append({
                    "text": text,
                    "page_number": page_idx + 1
                })
        return pages

    def parse_and_index(self, pdf_path: str, company_name: str, session_id: str):
        """Chunks the text and saves it into an isolated vector database collection"""
        pages = self.extract_text_with_page_metadata(pdf_path)
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=150)
        chunks = []
        metadatas = []
        for page in pages:
            splits = text_splitter.split_text(page["text"])
            for split in splits:
                chunks.append(split)
                metadatas.append({
                    "session_id": session_id,
                    "company_name": company_name.upper(),
                    "page_number": page["page_number"]
                })
        
        Chroma.from_texts(
            texts=chunks,
            embedding=self.embeddings,
            metadatas=metadatas,
            persist_directory=self.db_path,
            collection_name=f"session_{session_id}"
        )
        return len(chunks)
    
    FINANCIAL_KEYWORDS = [
    "revenue", "net income", "net loss", "operating margin",
    "operating income", "risk factor", "total sales", "gross profit"
    ]

    def get_context_for_company(self, session_id: str, company_name: str, max_chars: int = 30000) -> str:
        """Retrieves all indexed chunks for a given company within a session,
        ordered by page number, and joins them into a single text blob."""
        try:
            vectordb = Chroma(
                persist_directory=self.db_path,
                embedding_function=self.embeddings,
                collection_name=f"session_{session_id}"
            )
        except Exception:
            return ""

        results = vectordb.get(
            where={"company_name": company_name.upper()},
            include=["documents", "metadatas"]
        )

        docs = results.get("documents", [])
        metadatas = results.get("metadatas", [])

        if not docs:
            return ""

        paired = list(zip(docs, metadatas))

        def has_keyword(text: str) -> bool:
            lower = text.lower()
            return any(kw in lower for kw in self.FINANCIAL_KEYWORDS)

        priority = sorted(
            [p for p in paired if has_keyword(p[0])],
            key=lambda x: x[1].get("page_number", 0),
        )
        rest = sorted(
            [p for p in paired if not has_keyword(p[0])],
            key=lambda x: x[1].get("page_number", 0),
        )

        combined = ""

        for text, metadata in priority + rest:
            if len(combined) + len(text) > max_chars:
                break
            combined += f"\n\n[Page {metadata.get('page_number', '?')}]\n{text}"

        return combined.strip()
    # fitz is for pdf upload...
    #langchain_text_splitters is for splitting the sentances...
    #langchain_community.vectorstores is for like finding the data and storing for an exact work... 
    #langchain_community.embeddings is for embedding... 
    #by enumerations... going through every page and adding page no in the pages list...
    # parse and index fun for creating chunks... 
    #chunks is empty list that will collect the raw text strings of all split paragraphs... 
    # metadatas - empty list that will collect dictionaries containing background information..
    # And later everything is stored in the database...
    
