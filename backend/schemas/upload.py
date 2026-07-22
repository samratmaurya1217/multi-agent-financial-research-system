from pydantic import BaseModel

class UploadFileRequest(BaseModel):
    document_id: str
    workspace_id: str
    filename: str  # Base64 encoded content of the file
    filetype: str  # MIME type of the file
    storage_path: str  # Path where the file is stored in the system