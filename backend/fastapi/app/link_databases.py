from mongo_db import get_document

from postgres_db import (
    get_connection,
    update_mongo_document_id
)


print("=" * 70)
print("LINKING POSTGRESQL WITH MONGODB ATLAS")
print("=" * 70)


# ---------------------------------------------------------
# Get legal documents from PostgreSQL
# ---------------------------------------------------------

connection = get_connection()

cursor = connection.cursor()

cursor.execute(
    """
    SELECT filename
    FROM legal_documents
    ORDER BY document_id;
    """
)

documents = cursor.fetchall()

cursor.close()
connection.close()


print()

print(
    f"PostgreSQL documents found: "
    f"{len(documents)}"
)


# ---------------------------------------------------------
# Link each document
# ---------------------------------------------------------

linked = 0


for row in documents:

    filename = row[0]

    mongo_document = get_document(
        filename
    )


    if mongo_document is None:

        print(
            f"NOT FOUND in MongoDB Atlas: "
            f"{filename}"
        )

        continue


    mongo_id = str(
        mongo_document["_id"]
    )


    update_mongo_document_id(

        filename=filename,

        mongo_document_id=mongo_id

    )


    print(
        f"Linked: {filename}"
    )

    print(
        f"MongoDB ID: {mongo_id}"
    )

    print("-" * 70)


    linked += 1


print()

print("=" * 70)

print(
    f"Successfully linked: "
    f"{linked} documents"
)

print("=" * 70)