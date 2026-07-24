import json
from typing import Dict, Any
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

class FinancialMetrics(BaseModel):
    company_name: str = Field(description="Name of the company")
    revenue: str = Field(description="Total revenue or sales mentioned in the text, with currency")
    net_income: str = Field(description="Net income, net profit, or net loss")
    operating_margin: str = Field(description="Operating margin percentage or operating profit")
    key_risks: list[str] = Field(description="List of top 3-5 financial or operational red flags/risks")

class ExtractionAgent:
    def __init__(self, groq_api_key: str):
        self.llm = ChatGroq(
            groq_api_key=groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.0  
        )
        
        self.parser = JsonOutputParser(pydantic_object=FinancialMetrics)
        
        self.prompt = ChatPromptTemplate.from_template(
            "You are an expert financial analyst. Extract structured financial data from the provided text.\n\n"
            "INSTRUCTIONS:\n"
            "1. Strictly extract the information requested.\n"
            "2. If a specific metric is not mentioned in the text, return 'Not Mentioned'.\n"
            "3. Do not invent or hallucinate financial values.\n\n"
            "{format_instructions}\n\n"
            "FINANCIAL DOCUMENT TEXT:\n"
            "{document_text}\n"
        )

        self.chain = self.prompt | self.llm | self.parser

    def extract_financial_data(self, text_content: str) -> Dict[str, Any]:
        """Runs the extraction pipeline on the provided document text."""
        try:
            response = self.chain.invoke({
                "format_instructions": self.parser.get_format_instructions(),
                "document_text": text_content
            })
            return response
        except Exception as e:
            return {"error": f"Failed to extract financial data: {str(e)}"}