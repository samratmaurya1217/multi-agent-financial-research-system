from fastapi import APIRouter
from uuid import uuid4

router = APIRouter()

@router.get("/")
def get_workspace():
    return {
        "workspace": "default",
        "message": "Workspace is active and ready for use."}

@router.post("/")
def create_workspace():
    workspace_id = str(uuid4())
    return {"message": "New workspace created successfully.", "workspace_id": workspace_id}

@router.get("/{workspace_id}")
def get_workspace_by_id(workspace_id: str):
    return {
        "workspace_id": workspace_id,
        "status": "active"
    }

@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: str):
    return {"message": f"Workspace with ID {workspace_id} deleted successfully."}