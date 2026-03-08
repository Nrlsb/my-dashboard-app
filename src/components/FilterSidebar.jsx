import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react';

const FilterSidebar = ({
    categories = [],
    brands = [],
    selectedCategories = [],
    selectedBrands = [],
    onCategoryChange,
    onBrandChange,
    onClearFilters,
    isOpen,
    onClose
}) => {
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        brands: true
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleCheckboxChange = (id, type) => {
        if (type === 'category') {
            const newSelection = selectedCategories.includes(id)
                ? selectedCategories.filter(item => item !== id)
                : [...selectedCategories, id];
            onCategoryChange(newSelection);
        } else if (type === 'brand') {
            const newSelection = selectedBrands.includes(id)
                ? selectedBrands.filter(item => item !== id)
                : [...selectedBrands, id];
            onBrandChange(newSelection);
        }
    };

    const hasActiveFilters = selectedCategories.length > 0 || selectedBrands.length > 0;

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-2">
                    <Filter size={20} className="text-blue-600" />
                    <h2 className="font-bold text-gray-800 uppercase tracking-wider text-sm">Filtros</h2>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                        Limpiar todo
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {/* Categoría Section */}
                <div className="space-y-3">
                    <button
                        onClick={() => toggleSection('categories')}
                        className="flex items-center justify-between w-full text-left group"
                    >
                        <span className="font-bold text-gray-700 text-xs uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">Categoría</span>
                        {expandedSections.categories ? <ChevronUp size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" /> : <ChevronDown size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />}
                    </button>
                    {expandedSections.categories && (
                        <div className="space-y-4 pt-1">
                            {categories.map(cat => (
                                <div key={cat.categoryId} className="space-y-1">
                                    <h3 className="font-bold text-[13px] text-gray-800 uppercase tracking-wide">
                                        {cat.title}
                                    </h3>
                                    <div className="pl-2 space-y-1.5 pt-1">
                                        {cat.subcategories.map(sub => (
                                            <label key={sub.id} className="flex items-center gap-3 cursor-pointer group py-0.5">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        className="appearance-none h-4 w-4 border-2 border-gray-300 rounded-sm checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                                                        checked={selectedCategories.includes(sub.id)}
                                                        onChange={() => handleCheckboxChange(sub.id, 'category')}
                                                    />
                                                    {selectedCategories.includes(sub.id) && (
                                                        <svg className="absolute w-2.5 h-2.5 text-white fill-current left-[3px] top-[3px] pointer-events-none" viewBox="0 0 20 20">
                                                            <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className={`text-[13px] transition-colors ${selectedCategories.includes(sub.id) ? 'text-blue-700 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                                    {sub.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Marca Section */}
                <div className="space-y-3">
                    <button
                        onClick={() => toggleSection('brands')}
                        className="flex items-center justify-between w-full text-left group"
                    >
                        <span className="font-bold text-gray-700 text-xs uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">Marca</span>
                        {expandedSections.brands ? <ChevronUp size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" /> : <ChevronDown size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />}
                    </button>
                    {expandedSections.brands && (
                        <div className="space-y-1.5 pt-1">
                            {brands.map(brand => (
                                <label key={brand} className="flex items-center gap-3 cursor-pointer group py-0.5">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="appearance-none h-4 w-4 border-2 border-gray-300 rounded-sm checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                                            checked={selectedBrands.includes(brand)}
                                            onChange={() => handleCheckboxChange(brand, 'brand')}
                                        />
                                        {selectedBrands.includes(brand) && (
                                            <svg className="absolute w-2.5 h-2.5 text-white fill-current left-[3px] top-[3px] pointer-events-none" viewBox="0 0 20 20">
                                                <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className={`text-[13px] transition-colors ${selectedBrands.includes(brand) ? 'text-blue-700 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                        {brand}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 h-[calc(100vh-140px)] sticky top-20 border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <SidebarContent />
            </aside>

            {/* Mobile Drawer */}
            <div className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
                <div className={`absolute left-0 top-0 h-full w-80 bg-white shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex justify-end p-2 absolute right-0 top-0">
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-gray-500" />
                        </button>
                    </div>
                    <SidebarContent />
                </div>
            </div>
        </>
    );
};

export default FilterSidebar;
