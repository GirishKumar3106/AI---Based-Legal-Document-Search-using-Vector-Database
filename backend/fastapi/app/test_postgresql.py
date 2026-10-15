from postgres_db import (
    test_connection,
    get_legal_documents
)


print("=" * 60)
print("POSTGRESQL CONNECTION TEST")
print("=" * 60)


if not test_connection():

    print()
    print("PostgreSQL connection FAILED.")

    raise SystemExit(1)


print()
print("PostgreSQL connection successful.")


print()
print("Legal document metadata:")


documents = get_legal_documents()


for document in documents:

    print(
        f"ID={document[0]} | "
        f"File={document[1]} | "
        f"Title={document[2]} | "
        f"Category={document[3]} | "
        f"Source={document[5]}"
    )


print()
print(
    f"Total metadata records: "
    f"{len(documents)}"
)


print()
print("PostgreSQL test completed.")