from fastapi import FastAPI


app = FastAPI(
    title="Multi-Agent Financial Research System",
    description="A multi-agent system for financial research and analysis",
    version="1.0.0"
)

@app.get("/")
def home():
    return {"message": "Welcome to the Multi-Agent Financial Research System!"} 