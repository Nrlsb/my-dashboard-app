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
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-espint-green transition-colors duration-300" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2.5 border-none rounded-full leading-5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-espint-green/50 transition-all duration-300 sm:text-sm shadow-lg"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </form>
    );
};

export default SearchBar;
