from engine import (
    ingest_all_documents,
    RAW_DATA_PATH,
    collection
)


if __name__ == "__main__":

    print("======================================")
    print("LEGAL DOCUMENT INGESTION")
    print("======================================")

    print()
    print(f"Raw data path:")
    print(RAW_DATA_PATH)

    print()
    print("PDF files:")

    pdf_files = list(
        RAW_DATA_PATH.glob("*.pdf")
    )

    for pdf in pdf_files:
        print(f"  - {pdf.name}")

    print()
    print(
        f"Existing ChromaDB chunks: "
        f"{collection.count()}"
    )

    print()

    total = ingest_all_documents()

    print()
    print(
        f"Finished. Total chunks indexed: "
        f"{total}"
    )

    print(
        f"ChromaDB total count now: "
        f"{collection.count()}"
    )