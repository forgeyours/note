/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, X, FileText, CornerDownRight } from 'lucide-react';
import { listPages, listNotebooks } from '../../lib/db';
import { Page, Notebook } from '../../types';

interface SidebarSearchProps {
  onSelectPage: (pageId: string, notebookId: string) => void;
}

export default function SidebarSearch({ onSelectPage }: SidebarSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ page: Page; notebookName: string; textMatch?: string }[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);

  useEffect(() => {
    listNotebooks().then(setNotebooks);
  }, []);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      return;
    }

    const searchQuery = val.toLowerCase();
    try {
      const allPages = await listPages();
      const filteredResults: typeof results = [];

      allPages.forEach((page) => {
        const matchesTitle = page.title.toLowerCase().includes(searchQuery);
        
        // Search inside text blocks
        let matchedBlockContent = '';
        const matchesTextBlocks = page.textBlocks?.some((block) => {
          const rawText = block.content.replace(/<[^>]*>/g, '').toLowerCase();
          if (rawText.includes(searchQuery)) {
            // grab partial clip Around match
            const idx = rawText.indexOf(searchQuery);
            const start = Math.max(0, idx - 40);
            const end = Math.min(rawText.length, idx + searchQuery.length + 40);
            matchedBlockContent = `"...${rawText.slice(start, end).trim()}..."`;
            return true;
          }
          return false;
        });

        if (matchesTitle || matchesTextBlocks) {
          const parentNotebook = notebooks.find((n) => n.id === page.notebookId);
          filteredResults.push({
            page,
            notebookName: parentNotebook ? parentNotebook.name : 'Unknown Notebook',
            textMatch: matchedBlockContent || undefined
          });
        }
      });

      setResults(filteredResults);
    } catch (e) {
      console.error('Failed to run full-text search', e);
    }
  };

  return (
    <div className="flex flex-col space-y-2 select-none" id="full-text-search-engine">
      <div className="relative">
        <input
          type="text"
          placeholder="Search notes & text content..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-8 pr-7 py-1.5 text-xs bg-bg-secondary dark:bg-[#12131A] border border-gray-200 dark:border-[#2E303B] text-text-primary dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary placeholder:text-text-muted dark:placeholder:text-gray-500"
        />
        <Search className="absolute left-2.5 top-2.5 text-text-muted dark:text-gray-500" size={13} />
        {query && (
          <button 
            type="button"
            onClick={() => handleSearch('')}
            className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary dark:hover:text-white focus:outline-none"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="bg-white dark:bg-[#1E2028] border border-gray-100 dark:border-[#2E303B] rounded-xl max-h-[250px] overflow-y-auto p-2 flex flex-col space-y-2 shadow-sm">
          <div className="text-[10px] text-text-muted dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100 dark:border-[#2E303B] pb-1">
            Search Results ({results.length})
          </div>

          {results.length === 0 ? (
            <div className="text-[11px] text-text-muted dark:text-gray-500 italic text-center py-4">
              No matching pages found.
            </div>
          ) : (
            results.map(({ page, notebookName, textMatch }) => (
              <div
                key={page.id}
                onClick={() => onSelectPage(page.id, page.notebookId)}
                className="p-1.5 hover:bg-bg-secondary dark:hover:bg-[#252834] rounded-lg cursor-pointer flex flex-col space-y-0.5 border border-transparent hover:border-gray-200 dark:hover:border-[#2E303B] transition-all duration-155"
              >
                <div className="flex items-center space-x-1 text-xs font-semibold text-text-primary dark:text-white">
                  <FileText className="text-brand-primary shrink-0" size={12} />
                  <span className="truncate">{page.title}</span>
                </div>
                <div className="flex items-center space-x-1 pl-3 text-[10px] text-text-muted dark:text-gray-400">
                  <CornerDownRight size={9} />
                  <span className="truncate">{notebookName}</span>
                </div>
                {textMatch && (
                  <div className="pl-3 text-[10px] text-text-secondary dark:text-gray-300 italic line-clamp-2 bg-gray-50 dark:bg-[#12131A] p-1 rounded font-mono border border-transparent dark:border-[#2E303B]">
                    {textMatch}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
