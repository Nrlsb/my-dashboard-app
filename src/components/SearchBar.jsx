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
        <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-espint-blue transition-colors duration-300" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-3 border-none rounded-full leading-5 bg-white text-espint-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-espint-green transition-all duration-300 sm:text-sm shadow-sm hover:shadow-md"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </form>
    );
};

export default SearchBar;
