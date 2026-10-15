from engine import semantic_search, collection


print("Loading embedding model...")


print(f"ChromaDB collection count: {collection.count()}")

query = input(
    "Enter your legal query: "
).strip()


results = semantic_search(
    query=query,
    top_k=5
)


print()
print("=" * 70)
print("SEARCH RESULTS")
print("=" * 70)


if not results:

    print("No results found.")

else:

    for index, result in enumerate(
        results,
        start=1
    ):

        print()
        print(f"Result #{index}")

        print(
            f"Document   : "
            f"{result['document']}"
        )

        print(
            f"Page       : "
            f"{result['page']}"
        )

        print(
            f"Chunk      : "
            f"{result['chunk_number']}"
        )

        print(
            f"Similarity : "
            f"{result['similarity']}"
        )

        print(
            f"Text       : "
            f"{result['text'][:500]}"
        )

        print("-" * 70)