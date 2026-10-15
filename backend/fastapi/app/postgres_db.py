import os

import psycopg2
from dotenv import load_dotenv


# ---------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------

load_dotenv()


# ---------------------------------------------------------
# PostgreSQL configuration
# ---------------------------------------------------------

POSTGRES_HOST = os.getenv(
    "POSTGRES_HOST",
    "localhost"
)

POSTGRES_PORT = os.getenv(
    "POSTGRES_PORT",
    "5432"
)

POSTGRES_DB = os.getenv(
    "POSTGRES_DB",
    "legal_search"
)

POSTGRES_USER = os.getenv(
    "POSTGRES_USER",
    "postgres"
)

POSTGRES_PASSWORD = os.getenv(
    "POSTGRES_PASSWORD"
)


# ---------------------------------------------------------
# Connection
# ---------------------------------------------------------

def get_connection():

    return psycopg2.connect(

        host=POSTGRES_HOST,

        port=POSTGRES_PORT,

        database=POSTGRES_DB,

        user=POSTGRES_USER,

        password=POSTGRES_PASSWORD
    )


# ---------------------------------------------------------
# Test connection
# ---------------------------------------------------------

def test_connection():

    connection = None

    try:

        connection = get_connection()

        return True

    except Exception as exc:

        print(
            f"PostgreSQL connection error: {exc}"
        )

        return False

    finally:

        if connection:
            connection.close()


# ---------------------------------------------------------
# Get all legal-document metadata
# ---------------------------------------------------------

def get_legal_documents():

    connection = get_connection()

    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                document_id,
                filename,
                title,
                category,
                document_year,
                source,
                mongo_document_id,
                created_at
            FROM legal_documents
            ORDER BY document_id;
            """
        )

        return cursor.fetchall()

    finally:

        cursor.close()

        connection.close()

        # ---------------------------------------------------------
# Update MongoDB reference
# ---------------------------------------------------------

def update_mongo_document_id(
    filename: str,
    mongo_document_id: str
):

    connection = get_connection()

    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            UPDATE legal_documents
            SET mongo_document_id = %s
            WHERE filename = %s;
            """,
            (
                mongo_document_id,
                filename
            )
        )

        connection.commit()

        return cursor.rowcount

    except Exception:

        connection.rollback()

        raise

    finally:

        cursor.close()
        connection.close()

# ---------------------------------------------------------
# Get document metadata by filename
# ---------------------------------------------------------

def get_document_metadata(filename: str):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                document_id,
                filename,
                title,
                category,
                document_year,
                source,
                mongo_document_id
            FROM legal_documents
            WHERE filename = %s;
            """,
            (filename,)
        )

        row = cursor.fetchone()

        if row is None:
            return None

        return {
            "document_id": row[0],
            "filename": row[1],
            "title": row[2],
            "category": row[3],
            "document_year": row[4],
            "source": row[5],
            "mongo_document_id": row[6]
        }

    finally:

        cursor.close()
        connection.close()

# ---------------------------------------------------------
# Save search history
# ---------------------------------------------------------

def save_search_history(
    query: str,
    top_k: int,
    user_id=None
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            INSERT INTO search_history
            (user_id, query, top_k)
            VALUES (%s, %s, %s);
            """,
            (
                user_id,
                query,
                top_k
            )
        )

        connection.commit()

    except Exception:

        connection.rollback()

        raise

    finally:

        cursor.close()
        connection.close()