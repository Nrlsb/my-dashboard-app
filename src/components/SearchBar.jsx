import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/new-order?search=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm('');
        }
    };

    return (
        <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto px-4">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-300 group-focus-within:text-espint-green transition-colors duration-300" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2.5 border-none rounded-full leading-5 bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-espint-green/50 transition-all duration-300 sm:text-sm backdrop-blur-sm shadow-inner"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                    <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-medium text-gray-300 bg-white/10 rounded border border-white/10">
                        Enter
                    </kbd>
                </div>
            </div>
        </form>
    );
};

export default SearchBar;
