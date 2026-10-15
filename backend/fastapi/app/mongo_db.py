import os

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError


# ---------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------

load_dotenv()


# ---------------------------------------------------------
# MongoDB Atlas configuration
# ---------------------------------------------------------

MONGO_URI = os.getenv("MONGO_URI")

DATABASE_NAME = "legal_document_search"

COLLECTION_NAME = "documents"


# ---------------------------------------------------------
# Validate connection string
# ---------------------------------------------------------

if not MONGO_URI:

    raise RuntimeError(
        "MONGO_URI is not set. "
        "Please create a .env file and add your "
        "MongoDB Atlas connection string."
    )


# ---------------------------------------------------------
# MongoDB client
# ---------------------------------------------------------

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=10000
)


database = client[
    DATABASE_NAME
]


documents_collection = database[
    COLLECTION_NAME
]


# ---------------------------------------------------------
# Test connection
# ---------------------------------------------------------

def test_connection():

    try:

        client.admin.command("ping")

        return True

    except PyMongoError as exc:

        print(
            f"MongoDB connection error: {exc}"
        )

        return False


# ---------------------------------------------------------
# Save / update document
# ---------------------------------------------------------

def save_document(
    filename: str,
    content: str,
    pages: list
):

    document = {

        "filename": filename,

        "content": content,

        "page_count": len(pages),

        "pages": pages
    }


    result = documents_collection.update_one(

        {
            "filename": filename
        },

        {
            "$set": document
        },

        upsert=True

    )


    return {

        "matched": result.matched_count,

        "modified": result.modified_count,

        "upserted_id": (
            str(result.upserted_id)
            if result.upserted_id
            else None
        )
    }


# ---------------------------------------------------------
# Retrieve document
# ---------------------------------------------------------

def get_document(
    filename: str
):

    return documents_collection.find_one(
        {
            "filename": filename
        }
    )


# ---------------------------------------------------------
# Count documents
# ---------------------------------------------------------

def count_documents():

    return documents_collection.count_documents({})