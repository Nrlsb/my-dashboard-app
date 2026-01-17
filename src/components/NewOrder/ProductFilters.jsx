import React from 'react';
import { Search } from 'lucide-react';
import CustomSelect from '../CustomSelect';

const ProductFilters = ({
    searchTerm,
    setSearchTerm,
    selectedBrand,
    setSelectedBrand,
    allBrands,
    setCurrentPage
}) => {
    return (
        <div className="p-6 bg-white rounded-lg shadow-md mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <label htmlFor="search-product" className="sr-only">
                        Buscar Producto
                    </label>
                    <div className="relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            id="search-product"
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-espint-blue focus:border-espint-blue"
                            placeholder="Buscar por nombre o código..."
                        />
                    </div>
                </div>

                <div className="relative">
                    <label htmlFor="brand-select" className="sr-only">
                        Seleccionar Marca
                    </label>
                    <CustomSelect
                        options={allBrands}
                        value={selectedBrand}
                        onChange={(val) => {
                            setSelectedBrand(val);
                            setCurrentPage(1);
                        }}
                        placeholder="Todas las marcas"
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductFilters;
