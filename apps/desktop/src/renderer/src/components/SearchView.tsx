import React, { useState } from 'react';
import { Search, PlayCircle } from 'lucide-react';
import { SearchResult } from '@insight/shared';

function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script,iframe,object,embed,form,link,style').forEach(el => el.remove());
  div.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return div.innerHTML;
}

export const SearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      const res = await window.electron.search.query(query);
      setResults(res);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Search className="text-blue-600" />
        Wyszukiwarka Treści
      </h2>
      
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj w tytułach i transkrypcjach..."
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <button 
          type="submit" 
          disabled={searching}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {searching ? 'Szukam...' : 'Szukaj'}
        </button>
      </form>

      <div className="space-y-4">
        {results.map((r, idx) => (
          <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-slate-800">{r.title}</h3>
              {r.timestamp && (
                <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                  <PlayCircle size={12} /> {r.timestamp}
                </span>
              )}
            </div>
            <div 
              className="text-sm text-slate-600 mt-2"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.snippet) }}
            />
          </div>
        ))}
        {results.length === 0 && !searching && query && (
          <div className="text-center text-slate-400 py-4">Brak wyników.</div>
        )}
      </div>
    </div>
  );
};
