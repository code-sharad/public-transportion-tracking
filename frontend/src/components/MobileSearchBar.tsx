'use client';

import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface MobileSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  value?: string;
}

export default function MobileSearchBar({
  onSearch,
  placeholder = "Search routes, stops...",
  value = ""
}: MobileSearchBarProps) {
  const [searchValue, setSearchValue] = useState(value);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  const handleClear = () => {
    setSearchValue('');
    onSearch('');
  };

  return (
    <div className="floating-search">
      <form onSubmit={handleSubmit} className="flex items-center">
        <div className="flex-1 flex items-center px-4 py-3">
          <Search
            size={20}
            className="text-gray-400 mr-3 flex-shrink-0"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}

            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-base text-black placeholder-gray-400"
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 p-1 rounded-full hover:bg-gray-100 flex-shrink-0"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}