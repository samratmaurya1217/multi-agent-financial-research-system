from pydantic import BaseModel

class WorkspaceCreate(BaseModel):
    user_id: str
    name: str

class WorkspaceResponse(BaseModel):
    workspace_id: str
    name: str
    user_id: str
    document_manifest: List[str] = []  # List of document IDs associated with the workspace
    created_at: datetime