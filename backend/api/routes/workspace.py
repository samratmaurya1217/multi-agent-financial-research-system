from fastapi import APIRouter

router = APIRouter()

@router.get("/workspace")
def get_workspace():
    return {
        "workspace": "default",
        "message": "Workspace is active and ready for use."}

@router.post("/")
def create_workspace():
    return {"message": "New workspace created successfully."}