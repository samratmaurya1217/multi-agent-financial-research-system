from fastapi import FastAPI
from api.routes.upload import router as upload_router


app = FastAPI(
    title="Multi-Agent Financial Research System",
    description="A multi-agent system for financial research and analysis",
    version="1.0.0"
)

app.include_router(
    upload_router,
    prefix="/docs",
    tags=["Documents"])

@app.get("/")
def home():
    return {"message": "Welcome to the Multi-Agent Financial Research System!"} 