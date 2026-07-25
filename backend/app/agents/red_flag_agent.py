from typing import Dict, Any, List
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field


class RedFlag(BaseModel):
    category: str = Field(description="Type of risk, e.g. 'Liquidity', 'Profitability', 'Debt', 'Governance', 'Litigation', 'Operational', 'Accounting Quality'")
    severity: str = Field(description="One of: 'Low', 'Medium', 'High', 'Critical'")
    description: str = Field(description="Clear explanation of the red flag in plain language")
    evidence: str = Field(description="The specific figure, statement, or trend from the text that supports this flag")


class RedFlagReport(BaseModel):
    company_name: str = Field(description="Name of the company")
    overall_risk_level: str = Field(description="One of: 'Low', 'Medium', 'High', 'Critical' — overall assessment across all flags")
    red_flags: List[RedFlag] = Field(description="List of identified financial or operational red flags, ordered by severity descending")
    summary: str = Field(description="2-3 sentence plain-language summary of the company's risk profile")


class RedFlagAgent:
    def __init__(self, groq_api_key: str):
        self.llm = ChatGroq(
            groq_api_key=groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.0
        )
        self.parser = JsonOutputParser(pydantic_object=RedFlagReport)
        self.prompt = ChatPromptTemplate.from_template(
            "You are a skeptical, detail-oriented financial risk analyst. Your job is to "
            "identify genuine red flags in the provided financial document text — signs of "
            "financial distress, deteriorating fundamentals, aggressive accounting, governance "
            "concerns, litigation exposure, liquidity issues, or misleading disclosures.\n\n"
            "INSTRUCTIONS:\n"
            "1. Only flag issues that are actually supported by the text. Do not invent risks.\n"
            "2. Distinguish between routine disclosure boilerplate (ignore these) and genuine "
            "warning signs (flag these).\n"
            "3. For each flag, cite the specific evidence (figures, statements, trends) from the text.\n"
            "4. Assign severity based on materiality — a minor margin dip is 'Low', a going-concern "
            "warning or covenant breach is 'Critical'.\n"
            "5. If no significant red flags are found, return an empty red_flags list and note this "
            "in the summary — do not fabricate flags to fill the list.\n\n"
            "{format_instructions}\n\n"
            "FINANCIAL DOCUMENT TEXT:\n"
            "{document_text}\n"
        )
        self.chain = self.prompt | self.llm | self.parser

    def analyze_red_flags(self, text_content: str) -> Dict[str, Any]:
        """Runs the red-flag analysis pipeline on the provided document text."""
        try:
            response = self.chain.invoke({
                "format_instructions": self.parser.get_format_instructions(),
                "document_text": text_content
            })
            return response
        except Exception as e:
            return {"error": f"Failed to analyze red flags: {str(e)}"}