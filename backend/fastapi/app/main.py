from pathlib import Path
import shutil

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.engine import ingest_document, semantic_search
from app.postgres_db import get_document_metadata
from app.engine import ingest_document, semantic_search

from app.postgres_db import (
    get_document_metadata,
    save_search_history
)

app = FastAPI(
    title="AI Legal Document Search API",
    description="Semantic legal document search using embeddings and ChromaDB",
    version="1.0.0"
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[3]

UPLOAD_DIR = PROJECT_ROOT / "data" / "raw"

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ---------------------------------------------------------
# Request model
# ---------------------------------------------------------

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


# ---------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------

@app.get("/")
def root():

    return {
        "message": "AI Legal Document Search API",
        "status": "running"
    }


# ---------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------

@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# ---------------------------------------------------------
# Search endpoint
# ---------------------------------------------------------

@app.post("/search")
def search(request: SearchRequest):

    query = request.query.strip()

    if not query:

        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty."
        )

    if request.top_k <= 0:

        raise HTTPException(
            status_code=400,
            detail="top_k must be greater than zero."
        )

    try:

        results = semantic_search(
            query=query,
            top_k=request.top_k
        )

        save_search_history(
            query=query,
            top_k=request.top_k
        )

        enriched_results = []

        for result in results:

            filename = result["document"]

            metadata = get_document_metadata(
                filename
            )

            enriched_result = {
                "document": filename,
                "page": result["page"],
                "chunk_number": result["chunk_number"],
                "similarity": result["similarity"],
                "text": result["text"]
            }

            if metadata:

                enriched_result["document_id"] = (
                    metadata["document_id"]
                )

                enriched_result["title"] = (
                    metadata["title"]
                )

                enriched_result["category"] = (
                    metadata["category"]
                )

                enriched_result["document_year"] = (
                    metadata["document_year"]
                )

                enriched_result["source"] = (
                    metadata["source"]
                )

                enriched_result["mongo_document_id"] = (
                    metadata["mongo_document_id"]
                )

            enriched_results.append(
                enriched_result
            )

        return {
            "query": query,
            "total_results": len(enriched_results),
            "results": enriched_results
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )

# ---------------------------------------------------------
# Upload and index PDF
# ---------------------------------------------------------

@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is missing."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    file_path = UPLOAD_DIR / file.filename

    try:

        with file_path.open("wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

        indexed_chunks = ingest_document(
            file_path
        )

        return {
            "message": "Document uploaded and indexed successfully",
            "filename": file.filename,
            "chunks_indexed": indexed_chunks
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )