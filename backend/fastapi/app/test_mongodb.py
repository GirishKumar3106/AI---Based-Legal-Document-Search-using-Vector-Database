from mongo_db import (
    test_connection,
    count_documents,
    save_document
)


print("=" * 60)
print("MONGODB ATLAS CONNECTION TEST")
print("=" * 60)


# ---------------------------------------------------------
# Connection test
# ---------------------------------------------------------

if not test_connection():

    print()
    print("MongoDB Atlas connection FAILED.")

    raise SystemExit(1)


print()
print("MongoDB Atlas connection successful.")


# ---------------------------------------------------------
# Test document
# ---------------------------------------------------------

result = save_document(

    filename="atlas_test.pdf",

    content=(
        "This is a test document stored "
        "in MongoDB Atlas."
    ),

    pages=[
        {
            "page_number": 1,

            "text": (
                "This is a test document "
                "stored in MongoDB Atlas."
            )
        }
    ]
)


print()
print("Save result:")

print(result)


# ---------------------------------------------------------
# Count
# ---------------------------------------------------------

print()

print(
    "Total MongoDB documents:",
    count_documents()
)


print()
print("MongoDB Atlas test completed.")