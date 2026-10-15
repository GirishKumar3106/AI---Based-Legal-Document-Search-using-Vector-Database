from pathlib import Path
from typing import List, Dict
import hashlib

import chromadb
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

try:
    from app.mongo_db import save_document
except ModuleNotFoundError:
    from mongo_db import save_document

# =========================================================
# PROJECT PATHS
# =========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

CHROMA_PATH = PROJECT_ROOT / "database" / "chromadb"

RAW_DATA_PATH = PROJECT_ROOT / "data" / "raw"


# =========================================================
# EMBEDDING MODEL
# =========================================================

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

print("Loading embedding model...")

model = SentenceTransformer(MODEL_NAME)

print("Embedding model loaded.")


# =========================================================
# CHROMADB
# =========================================================

chroma_client = chromadb.PersistentClient(
    path=str(CHROMA_PATH)
)

collection = chroma_client.get_or_create_collection(
    name="legal_documents",
    metadata={
        "hnsw:space": "cosine"
    }
)


# =========================================================
# TEXT CLEANING
# =========================================================

def clean_text(text: str) -> str:

    if not text:
        return ""

    text = " ".join(text.split())

    return text.strip()


# =========================================================
# PDF PAGE EXTRACTION
# =========================================================

def extract_pdf_pages(
    pdf_path: Path
) -> List[Dict]:

    reader = PdfReader(
        str(pdf_path)
    )

    pages = []

    for page_number, page in enumerate(
        reader.pages,
        start=1
    ):

        try:

            text = page.extract_text() or ""

        except Exception as exc:

            print(
                f"Failed to extract page "
                f"{page_number} from "
                f"{pdf_path.name}: {exc}"
            )

            continue

        text = clean_text(text)

        if not text:
            continue

        pages.append(
            {
                "page_number": page_number,
                "text": text
            }
        )

    return pages


# =========================================================
# TEXT CHUNKING
# =========================================================

def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 150
) -> List[str]:

    if not text:

        return []

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:

            chunks.append(chunk)

        if end >= len(text):

            break

        start = end - overlap

    return chunks


# =========================================================
# CREATE CHUNKS FROM PDF
# =========================================================

def extract_pdf_chunks(
    pdf_path: Path
) -> List[Dict]:

    pages = extract_pdf_pages(
        pdf_path
    )

    all_chunks = []

    document_name = pdf_path.name

    for page_data in pages:

        page_number = page_data[
            "page_number"
        ]

        text = page_data[
            "text"
        ]

        chunks = chunk_text(
            text
        )

        for chunk_number, chunk in enumerate(
            chunks
        ):

            unique_string = (
                f"{document_name}|"
                f"{page_number}|"
                f"{chunk_number}|"
                f"{chunk}"
            )

            chunk_id = hashlib.md5(
                unique_string.encode(
                    "utf-8"
                )
            ).hexdigest()

            all_chunks.append(
                {
                    "id": chunk_id,
                    "document": document_name,
                    "page": page_number,
                    "chunk_number": chunk_number,
                    "text": chunk
                }
            )

    return all_chunks


# =========================================================
# INGEST ONE DOCUMENT
# =========================================================

def ingest_document(
    pdf_path: Path
) -> int:

    print()
    print(
        f"Processing: "
        f"{pdf_path.name}"
    )


    # -----------------------------------------------------
    # 1. Extract complete PDF
    # -----------------------------------------------------

    pages = extract_pdf_pages(
        pdf_path
    )

    if not pages:

        print(
            "No readable text found."
        )

        return 0


    # -----------------------------------------------------
    # 2. Prepare complete document text
    # -----------------------------------------------------

    full_text = "\n\n".join(

        [
            (
                f"PAGE "
                f"{page['page_number']}\n"
                f"{page['text']}"
            )

            for page in pages
        ]

    )


    # -----------------------------------------------------
    # 3. Store complete document in MongoDB Atlas
    # -----------------------------------------------------

    try:

        mongo_result = save_document(

            filename=pdf_path.name,

            content=full_text,

            pages=pages

        )

        print(
            "MongoDB: document stored successfully."
        )

        print(
            f"MongoDB result: "
            f"{mongo_result}"
        )

    except Exception as exc:

        print(
            "MongoDB storage failed."
        )

        print(
            f"Error: {exc}"
        )

        return 0


    # -----------------------------------------------------
    # 4. Create chunks for ChromaDB
    # -----------------------------------------------------

    chunks = extract_pdf_chunks(
        pdf_path
    )

    if not chunks:

        print(
            "No chunks created."
        )

        return 0


    documents = [
        item["text"]
        for item in chunks
    ]

    ids = [
        item["id"]
        for item in chunks
    ]

    metadatas = [

        {
            "document": item["document"],
            "page": item["page"],
            "chunk_number": item[
                "chunk_number"
            ]
        }

        for item in chunks

    ]


    # -----------------------------------------------------
    # 5. Generate embeddings
    # -----------------------------------------------------

    print(
        f"Generating embeddings for "
        f"{len(chunks)} chunks..."
    )

    embeddings = model.encode(

        documents,

        normalize_embeddings=True,

        show_progress_bar=True

    )


    # -----------------------------------------------------
    # 6. Store embeddings in ChromaDB
    # -----------------------------------------------------

    collection.upsert(

        ids=ids,

        documents=documents,

        metadatas=metadatas,

        embeddings=embeddings.tolist()

    )


    print(
        f"Indexed {len(chunks)} chunks "
        f"from {pdf_path.name}"
    )


    return len(chunks)


# =========================================================
# INGEST ALL DOCUMENTS
# =========================================================

def ingest_all_documents() -> int:

    pdf_files = list(
        RAW_DATA_PATH.glob("*.pdf")
    )

    if not pdf_files:

        print(
            "No PDF files found in:"
        )

        print(
            RAW_DATA_PATH
        )

        return 0


    total = 0


    for pdf_file in pdf_files:

        total += ingest_document(
            pdf_file
        )


    print()
    print("--------------------------------")
    print(
        f"Total indexed chunks: "
        f"{total}"
    )
    print("--------------------------------")


    return total


# =========================================================
# SEMANTIC SEARCH
# =========================================================

def semantic_search(
    query: str,
    top_k: int = 5
) -> List[Dict]:

    if not query.strip():

        return []


    query_embedding = model.encode(

        [query],

        normalize_embeddings=True

    )[0]


    results = collection.query(

        query_embeddings=[
            query_embedding.tolist()
        ],

        n_results=top_k,

        include=[
            "documents",
            "metadatas",
            "distances"
        ]

    )


    documents = results.get(
        "documents",
        [[]]
    )[0]

    metadatas = results.get(
        "metadatas",
        [[]]
    )[0]

    distances = results.get(
        "distances",
        [[]]
    )[0]


    final_results = []


    for document, metadata, distance in zip(

        documents,
        metadatas,
        distances

    ):

        similarity = 1 - float(
            distance
        )


        final_results.append(

            {
                "document": metadata.get(
                    "document"
                ),

                "page": metadata.get(
                    "page"
                ),

                "chunk_number": metadata.get(
                    "chunk_number"
                ),

                "similarity": round(
                    similarity,
                    4
                ),

                "text": document

            }

        )


    return final_results