import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/apiClient';
import {
  PageHeader, Card, SearchBar, Select, Badge, Button, Alert,
} from '../components/ui';
import { DOCUMENT_TYPES, CASE_TYPES } from '../data/mockData';

const SEARCH_MODES = ['Keyword', 'Semantic', 'Hybrid'];

function getRelevanceScore(doc, query, mode) {
  const q = query.toLowerCase();
  let score = 0;
  if (doc.name.toLowerCase().includes(q)) score += 40;
  if (doc.type.toLowerCase().includes(q)) score += 20;
  if (doc.description?.toLowerCase().includes(q)) score += 15;
  if (doc.caseId?.toLowerCase().includes(q)) score += 25;
  if (doc.uploadedBy.toLowerCase().includes(q)) score += 10;
  if (mode === 'Semantic' || mode === 'Hybrid') {
    // Simulate semantic boost
    score = Math.min(score + Math.floor(Math.random() * 20), 99);
  }
  return Math.max(score, doc.name.toLowerCase().includes(q) ? 60 : 0);
}

function getExcerpt(doc, query) {
  const parts = [doc.description, doc.name, doc.type, doc.uploadedBy];
  const q = query.toLowerCase();
  for (const part of parts) {
    if (part && part.toLowerCase().includes(q)) {
      const idx = part.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 30);
      const end = Math.min(part.length, idx + query.length + 50);
      return (start > 0 ? '...' : '') + part.substring(start, end) + (end < part.length ? '...' : '');
    }
  }
  return doc.description?.substring(0, 80) || doc.name;
}

export default function AISearch() {
  const { state, addAuditEvent } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('Hybrid');
  const [caseFilter, setCaseFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [integrityFilter, setIntegrityFilter] = useState('All');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults(null);

    try {
      const backendRes = await api.search(query, mode.toLowerCase());
      const searchItems = backendRes.results || [];

      const docs = searchItems.map((item) => ({
        id: item.document_id,
        name: item.title,
        title: item.title,
        type: item.document_type,
        caseId: item.case_id,
        classification: item.classification,
        score: Math.round(item.score * 100),
        excerpt: item.excerpt,
        integrityStatus: 'Verified',
        matchType: item.match_type,
      }));

      const matchingCases = state.cases
        .filter((c) => {
          const lower = query.toLowerCase();
          return (
            (c.id || '').toLowerCase().includes(lower) ||
            (c.caseNumber || '').toLowerCase().includes(lower) ||
            (c.title || '').toLowerCase().includes(lower) ||
            (c.type || '').toLowerCase().includes(lower) ||
            (c.assignedOfficer || '').toLowerCase().includes(lower)
          );
        })
        .slice(0, 3);

      setResults({ documents: docs, cases: matchingCases });
    } catch (err) {
      console.error('Search error:', err);
      setResults({ documents: [], cases: [] });
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="p-5">
      <PageHeader
        title="AI Semantic + Hybrid Search"
        subtitle="Search across all permitted cases, documents, and evidence using AI-powered semantic retrieval"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AI Search' }]}
      />

      {/* Search Box */}
      <Card className="mb-5">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search cases, documents, evidence... (e.g. 'FIR cyber fraud', 'witness statement', 'blockchain')"
              className="w-full pl-5 pr-32 py-3 border border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2747] placeholder:text-slate-400 text-base"
            />
            <Button
              variant="primary"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs font-medium text-[#475569]">Search Mode:</div>
            {SEARCH_MODES.map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs font-medium rounded-full border cursor-pointer transition-colors ${mode === m ? 'bg-[#0F2747] text-white border-[#0F2747]' : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#0F2747]'}`}
              >
                {m}
              </button>
            ))}
            <div className="ml-auto text-xs text-[#475569]">
              {mode === 'Keyword' && 'Exact keyword matching across all fields'}
              {mode === 'Semantic' && 'AI-powered semantic similarity search (vector embeddings)'}
              {mode === 'Hybrid' && 'Combined keyword + semantic retrieval with RRF fusion'}
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="text-xs font-medium text-[#475569] self-center">Filters:</div>
          <Select label="Case" value={caseFilter} onChange={setCaseFilter} options={['All', ...state.cases.map(c => ({ value: c.id, label: c.id }))]} className="w-48" />
          <Select label="Document Type" value={typeFilter} onChange={setTypeFilter} options={['All', ...DOCUMENT_TYPES]} className="w-44" />
          <Select label="Integrity" value={integrityFilter} onChange={setIntegrityFilter} options={['All', 'Verified', 'Tampered', 'Pending']} className="w-36" />
        </div>
      </Card>

      {/* Results */}
      {searching && (
        <div className="text-center py-10">
          <div className="inline-flex items-center gap-3 text-[#475569]">
            <div className="w-5 h-5 border-2 border-[#E2E8F0] border-t-[#0F2747] rounded-full animate-spin" />
            <span className="text-sm">
              {mode === 'Hybrid' && 'Running hybrid retrieval (BM25 + vector search + RRF fusion)...'}
              {mode === 'Semantic' && 'Computing semantic embeddings and running vector similarity search...'}
              {mode === 'Keyword' && 'Running keyword search across all permitted resources...'}
            </span>
          </div>
        </div>
      )}

      {results && !searching && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="text-sm text-[#475569]">
            Found <span className="font-semibold text-[#0F2747]">{results.documents.length + results.cases.length}</span> results for "<span className="italic">{query}</span>" using {mode} search
          </div>

          {/* Case Results */}
          {results.cases.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Cases</div>
              <div className="space-y-2">
                {results.cases.map(c => (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 bg-white border border-[#E2E8F0] rounded-lg p-3 cursor-pointer hover:border-[#0F2747] transition-colors"
                    onClick={() => navigate(`/cases/${c.id}`)}
                  >
                    <Badge variant="info">Case</Badge>
                    <div className="flex-1">
                      <div className="font-mono text-xs text-[#475569]">{c.id}</div>
                      <div className="font-medium text-sm text-[#1E293B]">{c.title}</div>
                      <div className="text-xs text-[#475569]">{c.type} · {c.status} · {c.assignedOfficer}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Results */}
          {results.documents.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Documents</div>
              <div className="space-y-2">
                {results.documents.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 bg-white border border-[#E2E8F0] rounded-lg p-3 cursor-pointer hover:border-[#0F2747] transition-colors"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <Badge variant="default">{doc.type}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-[#1E293B]">{doc.name}</span>
                        <span className="font-mono text-xs text-[#475569]">{doc.caseId}</span>
                      </div>
                      <div className="text-xs text-[#475569] mt-0.5">{doc.excerpt}</div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="text-xs text-[#475569]">Relevance:</div>
                          <div className="w-16 bg-[#F1F5F9] rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${doc.score >= 70 ? 'bg-green-500' : doc.score >= 40 ? 'bg-amber-500' : 'bg-slate-400'}`}
                              style={{ width: `${Math.min(doc.score, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[#1E293B]">{doc.score}%</span>
                        </div>
                        <div className="text-xs text-[#475569]">v{doc.version} · {doc.uploadedBy}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.documents.length === 0 && results.cases.length === 0 && (
            <div className="text-center py-10 text-sm text-[#475569]">
              No results found for "{query}" with current filters.
              Try a different query or adjust your filters.
            </div>
          )}
        </div>
      )}

      {!results && !searching && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 text-slate-200">⊕</div>
          <div className="text-sm font-medium text-[#475569]">Enter a search query to find documents, cases, and evidence</div>
          <div className="text-xs text-slate-400 mt-1">Use Hybrid mode for best results · Press Enter to search</div>
        </div>
      )}
    </div>
  );
}
