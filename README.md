# AI-Based Legal Document Search Using Vector Database

An academic project that uses AI-based text embeddings and vector similarity search to retrieve relevant passages from legal documents.

## Project Overview

Users can search legal documents using natural-language questions. The backend converts document chunks and queries into embeddings and uses vector similarity search to retrieve relevant passages.

## Architecture

- **Frontend:** React and Vite
- **API gateway/backend:** Spring Boot
- **AI and search service:** FastAPI
- **Vector database:** ChromaDB
- **Relational database:** PostgreSQL
- **Document database:** MongoDB

## Main Features

- Search legal documents using natural-language queries.
- Extract text from uploaded PDFs and split it into chunks.
- Generate embeddings and index document chunks for semantic retrieval.
- Return ranked search results with document and passage metadata.
- Upload and index PDF documents.
- Display search history and project information through the frontend.

## Repository Structure

```text
AI Legal Document Search/
├── backend/
│   ├── fastapi/
│   │   ├── app/
│   │   └── requirements.txt
│   └── springboot/
│       └── legal-search-backend/
├── data/
│   └── raw/
├── database/
├── frontend/
├── models/
├── scripts/
├── tests/
└── .gitignore
```

## Requirements

Install the versions compatible with the project configuration:

- Python and pip
- Java JDK
- Node.js and npm
- PostgreSQL
- MongoDB, or an appropriately configured MongoDB Atlas database
- Git

The embedding model and required Python packages must be available to the FastAPI service.

## Local Setup

### 1. Configure the databases

Start PostgreSQL and configure the required database and tables. Configure MongoDB and any required database credentials.

Set the Spring Boot environment variables before starting Spring Boot:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`

Keep real credentials in local environment settings, never in Git.

Configure the FastAPI environment variables according to the application's database and model configuration.

### 2. Start FastAPI

Open a terminal at the repository root:

```powershell
cd backend/fastapi
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 3. Start Spring Boot

Open a second terminal at the repository root. Set the required environment variables in that terminal, then run:

```powershell
cd backend/springboot/legal-search-backend
.\mvnw.cmd spring-boot:run
```

### 4. Start the React frontend

Open a third terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

Ensure the frontend API URL and Spring Boot's FastAPI service URL match your local configuration.

## API Endpoints

### Spring Boot

- `GET /api/health` — health check
- `POST /api/search` — search legal documents
- `POST /api/documents/upload` — upload a PDF

### FastAPI

- `GET /` — service response
- `POST /search` — semantic retrieval
- `POST /documents/upload` — extract, chunk, embed, and index a PDF

## Data and Indexing

Corpus note: The bundled PDFs are provided for academic demonstration. Their source, edition date, and legal text should be verified against official India Code publications before relying on them as authoritative legislation.

The initial project corpus includes five PDF files:

- `constitution.pdf`
- `consumer_act.pdf`
- `contract_act.pdf`
- `copyright_act.pdf`
- `it_act.pdf`

ChromaDB indexes should be initialized or rebuilt using the project's ingestion workflow. Local database files and credentials are not included in Git.

## Security Notes

- Do not commit `.env` files, passwords, API keys, or database connection strings containing credentials.
- Configure database access securely before deploying.
- The current login/register flow is a frontend demo and should not be treated as production-grade authentication.
- Do not upload confidential legal documents to a public deployment without appropriate access controls.

## Disclaimer

This project is intended for academic demonstration and information retrieval. Search results are not legal advice. Verify applicable legislation and amendments against authoritative sources before relying on legal information.

## Team

- B. Varshith
- Srinikesh
- Jatin
- Girish Kumar

**Institution:** KLH University
**Department:** Computer Science and Engineering
