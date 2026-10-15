import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:8080'

const BASE_DOCUMENTS = [
  { file: 'constitution.pdf', title: 'Constitution of India', category: 'Constitution', source: 'India Code', pages: 4 },
  { file: 'consumer_act.pdf', title: 'Consumer Protection Act', category: 'Consumer Law', source: 'India Code', pages: 4 },
  { file: 'contract_act.pdf', title: 'Indian Contract Act', category: 'Contract Law', source: 'India Code', pages: 4 },
  { file: 'copyright_act.pdf', title: 'Copyright Act', category: 'Intellectual Property', source: 'India Code', pages: 4 },
  { file: 'it_act.pdf', title: 'Information Technology Act', category: 'Cyber Law', source: 'India Code', pages: 4 },
]

const NAV = [
  ['home', 'Home', '⌂'],
  ['search', 'Search Documents', '⌕'],
  ['upload', 'Upload Document', '↑'],
  ['history', 'Search History', '◷'],
  ['dashboard', 'Dashboard', '▥'],
]

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('legalSearchHistory') || '[]')
  } catch {
    return []
  }
}

function saveHistory(items) {
  localStorage.setItem('legalSearchHistory', JSON.stringify(items.slice(0, 100)))
}

function getUploadedDocuments() {
  try {
    return JSON.parse(localStorage.getItem('legalUploadedDocs') || '[]')
  } catch {
    return []
  }
}

function App() {
  const [page, setPage] = useState('home')
  const [user, setUser] = useState(() => localStorage.getItem('legalSearchUser') || '')
  const [auth, setAuth] = useState(() => localStorage.getItem('legalSearchAuth') === '1')
  const [authMode, setAuthMode] = useState('login')

  // Search state
  const [history, setHistory] = useState(getHistory)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [backend, setBackend] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)

  // Upload state
  const [uploaded, setUploaded] = useState(getUploadedDocuments)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)

  // Global UI state
  const [toast, setToast] = useState('')

  useEffect(() => {
    checkBackend()
    const timer = setInterval(checkBackend, 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => saveHistory(history), [history])
  useEffect(() => {
    localStorage.setItem('legalUploadedDocs', JSON.stringify(uploaded))
  }, [uploaded])

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  async function checkBackend() {
    try {
      const response = await fetch(`${API_BASE}/api/health`)
      setBackend(response.ok)
    } catch {
      setBackend(false)
    }
  }

  // ---------------- AUTHENTICATION / LOCAL PROFILE ----------------

  function login(name) {
    const clean = String(name || '').trim() || 'Demo User'
    localStorage.setItem('legalSearchUser', clean)
    localStorage.setItem('legalSearchAuth', '1')
    setUser(clean)
    setAuth(true)
    setPage('home')
    notify(`Welcome back, ${clean}`)
  }

  function logout() {
    localStorage.removeItem('legalSearchAuth')
    setAuth(false)
    setAuthMode('login')
    setPage('home')
    setResults([])
    setQuery('')
    notify('Signed out')
  }

  // ---------------- SEARCH ----------------

  async function performSearch(searchText = query) {
    const q = String(searchText || '').trim()

    if (!q) {
      setPage('search')
      setError('Please enter a legal question before searching.')
      return
    }

    setQuery(q)
    setError('')
    setLoading(true)
    setPage('search')

    try {
      const response = await fetch(`${API_BASE}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Search request failed (${response.status})`)
      }

      const data = await response.json()
      const nextResults = Array.isArray(data.results) ? data.results : []

      setResults(nextResults)

      const entry = {
        id: Date.now(),
        query: q,
        count: Number(data.total_results || nextResults.length || 0),
        top: nextResults[0]?.document || '',
        topSimilarity: nextResults[0]?.similarity ?? null,
        at: new Date().toISOString(),
      }

      setHistory((prev) => [entry, ...prev.filter((item) => item.query !== q)])
      setBackend(true)
    } catch (e) {
      console.error('Search error:', e)
      setError(e.message || 'Unable to connect to the legal search backend.')
      setBackend(false)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // ---------------- DOCUMENT UPLOAD ----------------

  async function handleUpload(file) {
    if (!file) return

    const fileName = file.name || 'document.pdf'
    const isPdf =
      file.type === 'application/pdf' ||
      fileName.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      setUploadStatus({
        type: 'error',
        message: 'Only PDF files are supported.',
      })
      notify('Please select a PDF file')
      return
    }

    setUploading(true)
    setUploadStatus(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Upload failed (${response.status})`)
      }

      const data = await response.json()
      const filename = data.filename || fileName
      const indexedChunks = Number(data.chunks_indexed || 0)

      const newDocument = {
        name: filename,
        chunks: indexedChunks,
        status: 'Indexed',
        uploadedAt: new Date().toISOString(),
      }

      setUploaded((prev) => [
        newDocument,
        ...prev.filter((doc) => doc.name !== filename),
      ])

      setUploadStatus({
        type: 'success',
        message: `${filename} uploaded successfully — ${indexedChunks} chunks indexed.`,
      })

      setBackend(true)
      notify(`${filename} indexed successfully`)
    } catch (e) {
      console.error('Upload error:', e)
      setUploadStatus({
        type: 'error',
        message: e.message || 'Upload failed. Make sure Spring Boot and FastAPI are running.',
      })
      setBackend(false)
    } finally {
      setUploading(false)
    }
  }

  async function handleFileSelect(event) {
    const files = Array.from(event.target.files || [])

    if (!files.length) return

    // The backend endpoint accepts one PDF per request, so files are uploaded sequentially.
    for (const file of files) {
      await handleUpload(file)
    }

    // Allow selecting the same file again later.
    event.target.value = ''
  }

  function removeUploadedDocument(name) {
    // This removes the item from the frontend list only.
    // It does not delete vectors from ChromaDB because no delete endpoint exists yet.
    setUploaded((prev) => prev.filter((doc) => doc.name !== name))
    notify(`${name} removed from the local upload list`)
  }

  // ---------------- DERIVED METRICS ----------------

  const searchesCount = history.length

  const docsCount = useMemo(() => {
    const names = new Set(BASE_DOCUMENTS.map((doc) => doc.file))
    uploaded.forEach((doc) => names.add(doc.name))
    return names.size
  }, [uploaded])

  const topSimilarityAvg = useMemo(() => {
    const values = history
      .map((item) => Number(item.topSimilarity))
      .filter(Number.isFinite)

    return values.length
      ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)
      : '—'
  }, [history])

  const categoryCounts = useMemo(() => {
    const counts = BASE_DOCUMENTS.reduce((acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1
      return acc
    }, {})

    return counts
  }, [])

  // The auth screen existed in the previous working App.jsx and is intentionally retained.
  if (!auth) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        onLogin={login}
      />
    )
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        user={user}
        onLogout={logout}
      />

      <div className="main-shell">
        <Topbar
          backend={backend}
          user={user}
          setPage={setPage}
          onLogout={logout}
        />

        <main className="content-area">
          {page === 'home' && (
            <HomePage
              user={user}
              backend={backend}
              onSearch={performSearch}
              setPage={setPage}
              searches={searchesCount}
              docs={docsCount}
            />
          )}

          {page === 'search' && (
            <SearchPage
              query={query}
              setQuery={setQuery}
              results={results}
              loading={loading}
              error={error}
              onSearch={performSearch}
              onView={setSelectedDoc}
            />
          )}

          {page === 'upload' && (
            <UploadPage
              uploaded={uploaded}
              onFileSelect={handleFileSelect}
              uploading={uploading}
              uploadStatus={uploadStatus}
              onRemove={removeUploadedDocument}
            />
          )}

          {page === 'history' && (
            <HistoryPage
              history={history}
              onSearch={performSearch}
              onClear={() => {
                setHistory([])
                notify('Search history cleared')
              }}
            />
          )}

          {page === 'dashboard' && (
            <DashboardPage
              searches={searchesCount}
              docs={docsCount}
              avgSimilarity={topSimilarityAvg}
              history={history}
              categoryCounts={categoryCounts}
            />
          )}
        </main>
      </div>

      {selectedDoc && (
        <DocumentModal
          result={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function AuthScreen({ mode, setMode, onLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submit(event) {
    event.preventDefault()
    const fallback = email.split('@')[0]
    onLogin(name || fallback || 'Demo User')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">⚖</div>
          <div>
            <b>AI Legal Search</b>
            <span>Search legal documents using AI</span>
          </div>
        </div>

        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">
          {mode === 'login'
            ? 'Sign in to continue to your legal search workspace.'
            : 'Create a local demo profile for the application UI.'}
        </p>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>
          )}

          <label>
            Email or username
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required={mode === 'login'}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <button className="primary big" type="submit">
            {mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="auth-note">
          Demo authentication is stored locally in this browser; no server-side user table is used yet.
        </div>

        <button
          className="link-btn"
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login'
            ? "Don't have an account? Register"
            : 'Already have an account? Login'}
        </button>
      </div>

      <div className="auth-hero">
        <div className="hero-pill">AI-POWERED LEGAL SEARCH</div>
        <h2>Find the right legal information using natural language.</h2>
        <p>
          Search across your indexed legal documents and inspect ranked, source-aware results.
        </p>
        <div className="hero-flow">
          <span>Query</span>
          <i>→</i>
          <span>Embedding</span>
          <i>→</i>
          <span>Vector Search</span>
          <i>→</i>
          <span>Results</span>
        </div>
      </div>
    </div>
  )
}

function Sidebar({ page, setPage, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="side-brand">
        <div className="side-logo">⚖</div>
        <div>
          <b>AI Legal Search</b>
          <small>Semantic legal retrieval</small>
        </div>
      </div>

      <div className="nav-block">
        {NAV.map(([id, label, icon]) => (
          <button
            key={id}
            className={`nav-item ${page === id ? 'active' : ''}`}
            onClick={() => setPage(id)}
            type="button"
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="side-status">
        <span className="dot green"></span>
        <div>
          <b>Connected stack</b>
          <small>React · Spring Boot · FastAPI</small>
        </div>
      </div>

      <div className="side-user">
        <div className="avatar">{user[0]?.toUpperCase() || 'U'}</div>
        <div>
          <b>{user || 'Demo User'}</b>
          <small>Local profile</small>
        </div>
        <button onClick={onLogout} title="Sign out" type="button">
          ↪
        </button>
      </div>
    </aside>
  )
}

function Topbar({ backend, user, setPage, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <div className="crumb">WORKSPACE / {user.toUpperCase()}</div>
        <h1>AI Legal Document Search</h1>
      </div>

      <div className={`connection ${backend ? 'connected' : 'offline'}`}>
        <span></span>
        {backend ? 'Backend Connected' : 'Backend Offline'}
      </div>

      <button className="top-search" onClick={() => setPage('search')} type="button">
        ⌕&nbsp; Search
      </button>

      <button className="top-logout" onClick={onLogout} type="button" title="Sign out">
        Sign out
      </button>
    </header>
  )
}

function HomePage({ user, backend, onSearch, setPage, searches, docs }) {
  const [q, setQ] = useState('')

  function submit() {
    onSearch(q)
  }

  return (
    <div className="page home-page">
      <section className="hero-card">
        <div className="hero-pill">AI-POWERED LEGAL SEARCH</div>
        <h2>
          Find the right legal information
          <br />
          using natural language.
        </h2>
        <p>
          Ask a legal question and discover the most relevant sections from your indexed legal documents using semantic search.
        </p>

        <div className="search-bar">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Example: What protections exist for copyrighted work?"
          />
          <button onClick={submit} type="button">Search</button>
        </div>

        <div className="quick-row">
          <button
            onClick={() => onSearch('What are the essential requirements for a valid contract?')}
            type="button"
          >
            Try a contract query
          </button>
          <button
            onClick={() => onSearch('What legal provisions apply to electronic records and cyber offences?')}
            type="button"
          >
            Try an IT-law query
          </button>
          <button onClick={() => setPage('upload')} type="button">
            Upload a document
          </button>
        </div>
      </section>

      <section className="stats-row">
        <Stat value={docs} label="Indexed / listed documents" icon="▤" tone="blue" />
        <Stat value="41+" label="Vector chunks currently known" icon="◈" tone="purple" />
        <Stat value="5" label="Results per search" icon="5" tone="teal" />
        <Stat value={searches} label="Searches in this browser" icon="⌕" tone="green" />
      </section>

      <section className="two-col">
        <div className="panel">
          <PanelTitle title="How the system works" sub="Current end-to-end search path" />
          <div className="mini-flow">
            {['React UI', 'Spring Boot', 'FastAPI', 'ChromaDB', 'PostgreSQL'].map((item, index) => (
              <div className="flow-node" key={item}>
                <span>{index + 1}</span>
                <b>{item}</b>
                {index < 4 && <i>→</i>}
              </div>
            ))}
          </div>
          <p className="panel-copy">
            MongoDB Atlas stores the legal document records, while PostgreSQL carries structured metadata and search history.
          </p>
        </div>

        <div className="panel">
          <PanelTitle title="Indexed legal corpus" sub="Current project documents" />
          <div className="doc-list">
            {BASE_DOCUMENTS.map((doc) => (
              <div className="doc-row" key={doc.file}>
                <div className="pdf">PDF</div>
                <div>
                  <b>{doc.title}</b>
                  <small>{doc.category} · {doc.source}</small>
                </div>
                <span>{doc.pages} pages</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="info-banner">
        <b>
          {backend
            ? `System is ready for semantic search${user ? `, ${user}` : ''}.`
            : 'Start Spring Boot and FastAPI to enable live search.'}
        </b>
        <span>5 core legal Acts are currently represented in the project corpus.</span>
      </div>
    </div>
  )
}

function SearchPage({ query, setQuery, results, loading, error, onSearch, onView }) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEMANTIC RETRIEVAL</div>
          <h2>Search Legal Documents</h2>
          <p>Ranked passages from the current indexed corpus.</p>
        </div>
        {results.length > 0 && <span className="result-badge">{results.length} results</span>}
      </div>

      <div className="search-bar large">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="Ask a legal question in natural language..."
        />
        <button onClick={() => onSearch()} disabled={loading} type="button">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="error-box">
          <b>Search unavailable</b>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <EmptyState
          title="No search performed yet"
          text="Try one of the project queries to retrieve ranked legal passages."
        />
      )}

      {loading && <LoadingState />}

      {!loading && results.length > 0 && (
        <div className="results-stack">
          {results.map((result, index) => (
            <ResultCard
              key={`${result.document}-${result.page}-${index}`}
              rank={index + 1}
              result={result}
              onView={onView}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ResultCard({ rank, result, onView }) {
  const similarity = Number(result.similarity || 0)
  const percent = Math.round(similarity * 100)

  return (
    <article className="result-card">
      <div className="result-rank">#{rank}</div>
      <div className="result-main">
        <div className="result-top">
          <div>
            <span className="tag">{result.category || 'Legal'}</span>
            <h3>{result.title || result.document}</h3>
            <small>
              {result.document} · Page {result.page} · {result.source || 'Source not specified'}
            </small>
          </div>

          <div className="similarity">
            <b>{similarity.toFixed(4)}</b>
            <span>similarity</span>
            <div className="sim-track">
              <i style={{ width: `${Math.min(percent, 100)}%` }}></i>
            </div>
          </div>
        </div>

        <p>{result.text}</p>

        <div className="result-actions">
          <button className="secondary" onClick={() => onView(result)} type="button">
            View details
          </button>
          <span>Chunk {result.chunk_number ?? 0}</span>
          <span>Document ID {result.document_id ?? '—'}</span>
        </div>
      </div>
    </article>
  )
}

function UploadPage({ uploaded, onFileSelect, uploading, uploadStatus, onRemove }) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">DOCUMENT MANAGEMENT</div>
          <h2>Upload Legal Document</h2>
          <p>Upload a legal PDF and automatically index it for semantic search.</p>
        </div>
        <span className="demo-tag">LIVE INGESTION</span>
      </div>

      <label className={`upload-zone ${uploading ? 'uploading' : ''}`}>
        <input
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={onFileSelect}
          disabled={uploading}
        />
        <div className="upload-icon">↑</div>
        <h3>
          {uploading
            ? 'Uploading and indexing…'
            : 'Drag and drop your PDF files here'}
        </h3>
        <p>or <span>Choose Files</span></p>
        <small>Supported format: PDF</small>
      </label>

      {uploading && (
        <div className="upload-status loading">
          Uploading document and creating vector embeddings…
        </div>
      )}

      {uploadStatus && (
        <div className={`upload-status ${uploadStatus.type}`}>
          {uploadStatus.type === 'success' ? '✓ ' : '⚠ '}
          {uploadStatus.message}
        </div>
      )}

      <div className="panel">
        <PanelTitle
          title="Uploaded Documents"
          sub="PDFs indexed through the application backend"
        />

        {uploaded.length === 0 ? (
          <EmptyState
            title="No uploaded documents"
            text="Choose a PDF above to send it to Spring Boot and FastAPI for indexing."
          />
        ) : (
          <div className="table">
            <div className="tr head">
              <span>File name</span>
              <span>Added</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {uploaded.map((document, index) => (
              <div className="tr" key={`${document.name}-${index}`}>
                <span className="file-name">{document.name}</span>
                <span>
                  {document.uploadedAt
                    ? new Date(document.uploadedAt).toLocaleString()
                    : '—'}
                </span>
                <span>
                  <em className="status-chip">
                    {document.status || 'Indexed'}
                    {document.chunks ? ` · ${document.chunks} chunks` : ''}
                  </em>
                </span>
                <span>
                  <button
                    className="danger"
                    onClick={() => onRemove(document.name)}
                    type="button"
                  >
                    Remove
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="notice">
        Uploaded PDFs are sent to the Spring Boot upload endpoint, processed by FastAPI, converted into embeddings, and indexed in ChromaDB. The document can then participate in semantic search.
      </div>
    </div>
  )
}

function HistoryPage({ history, onSearch, onClear }) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACTIVITY</div>
          <h2>Search History</h2>
          <p>Queries recorded by this browser after successful searches.</p>
        </div>
        <button
          className="secondary"
          onClick={onClear}
          disabled={!history.length}
          type="button"
        >
          Clear history
        </button>
      </div>

      {history.length === 0 ? (
        <EmptyState
          title="No searches yet"
          text="Your successful semantic searches will appear here."
        />
      ) : (
        <div className="history-grid">
          {history.map((item) => (
            <button
              className="history-card"
              key={item.id}
              onClick={() => onSearch(item.query)}
              type="button"
            >
              <div className="history-icon">⌕</div>
              <div>
                <b>{item.query}</b>
                <small>{new Date(item.at).toLocaleString()}</small>
              </div>
              <div className="history-meta">
                <strong>{item.count}</strong>
                <span>results</span>
              </div>
              <div className="history-arrow">→</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DashboardPage({ searches, docs, avgSimilarity, history, categoryCounts }) {
  const chartMax = Math.max(1, ...Object.values(categoryCounts))
  const trend = Array.from({ length: 7 }, (_, index) =>
    history.filter((item) =>
      Math.round((Date.now() - new Date(item.at).getTime()) / 86400000) === 6 - index
    ).length
  )

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">ANALYTICS</div>
          <h2>Analytics Dashboard</h2>
          <p>Metrics derived from the current local session and project corpus.</p>
        </div>
        <span className="demo-tag">LOCAL METRICS</span>
      </div>

      <div className="stats-row">
        <Stat value={docs} label="Documents represented" icon="▤" tone="blue" />
        <Stat value={searches} label="Successful searches" icon="⌕" tone="teal" />
        <Stat value="1" label="Local user profile" icon="●" tone="purple" />
        <Stat value={avgSimilarity} label="Avg. top-1 similarity" icon="≈" tone="green" />
      </div>

      <section className="two-col">
        <div className="panel">
          <PanelTitle title="Search Trend" sub="Successful searches by recent day" />
          <div className="bar-chart">
            {trend.map((value, index) => (
              <div className="bar-col" key={index}>
                <span>{value}</span>
                <div>
                  <i
                    style={{
                      height: `${Math.max(
                        8,
                        (value / Math.max(1, ...trend)) * 150
                      )}px`,
                    }}
                  />
                </div>
                <small>{['-6', '-5', '-4', '-3', '-2', '-1', 'Today'][index]}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <PanelTitle title="Document Categories" sub="Current core corpus" />
          <div className="category-list">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <div className="cat-row" key={category}>
                <span>{category}</span>
                <div>
                  <i style={{ width: `${(count / chartMax) * 100}%` }} />
                </div>
                <b>{count}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="panel">
        <PanelTitle title="Recent search evidence" sub="Latest successful retrievals" />
        {history.length === 0 ? (
          <EmptyState
            title="No search activity"
            text="Run a search to populate dashboard evidence."
          />
        ) : (
          <div className="evidence-table">
            <div className="tr head">
              <span>Query</span>
              <span>Top document</span>
              <span>Similarity</span>
              <span>Results</span>
            </div>
            {history.slice(0, 8).map((item) => (
              <div className="tr" key={item.id}>
                <span>{item.query}</span>
                <span>{item.top || '—'}</span>
                <span>
                  {Number.isFinite(Number(item.topSimilarity))
                    ? Number(item.topSimilarity).toFixed(4)
                    : '—'}
                </span>
                <span>{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DocumentModal({ result, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="tag">{result.category || 'Legal'}</span>
            <h2>{result.title || result.document}</h2>
            <p>
              {result.document} · Page {result.page} · {result.source || 'Source not specified'}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} type="button">×</button>
        </div>

        <div className="modal-body">
          <div className="modal-stat">
            <b>{Number(result.similarity || 0).toFixed(4)}</b>
            <span>Similarity score</span>
          </div>
          <div className="modal-stat">
            <b>{result.chunk_number ?? 0}</b>
            <span>Chunk number</span>
          </div>
          <div className="modal-stat">
            <b>{result.document_id ?? '—'}</b>
            <span>PostgreSQL ID</span>
          </div>
          <div className="modal-stat">
            <b>{result.mongo_document_id ? 'Linked' : '—'}</b>
            <span>MongoDB reference</span>
          </div>

          <div className="passage">
            <h3>Retrieved passage</h3>
            <p>{result.text}</p>
          </div>
        </div>

        <div className="modal-foot">
          <span>Results are retrieval evidence, not legal advice.</span>
          <button className="primary" onClick={onClose} type="button">Close</button>
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label, icon, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

function PanelTitle({ title, sub }) {
  return (
    <div className="panel-title">
      <div>
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>
    </div>
  )
}

function EmptyState({ title, text }) {
  return (
    <div className="empty">
      <div>⌕</div>
      <b>{title}</b>
      <span>{text}</span>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <b>Searching the indexed legal corpus…</b>
      <span>Spring Boot → FastAPI → vector retrieval</span>
    </div>
  )
}

export default App
