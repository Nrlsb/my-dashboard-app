import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';

const PRODUCTS_PER_PAGE = 20;

const CategoryPage = ({ groupCode, onNavigate, onViewProductDetails }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupName, setGroupName] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (!groupCode) return;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await apiService.fetchProductsByGroup(groupCode, currentPage);
        
        setProducts(data.products);
        setGroupName(data.groupName);
        setTotalPages(Math.ceil(data.totalProducts / PRODUCTS_PER_PAGE));
        setError(null);
      } catch (err) {
        setError(`No se pudieron cargar los productos para el grupo ${groupCode}.`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [groupCode, currentPage, user]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Cargando productos...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <button onClick={() => onNavigate('dashboard')} className="mb-4 text-blue-500 hover:underline">
        &larr; Volver al Dashboard
      </button>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Categoría: <span className="text-blue-600">{groupName || groupCode}</span>
      </h1>
      
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <div 
                key={product.id} 
                className="border p-4 rounded-lg shadow-md bg-white flex flex-col justify-between cursor-pointer"
                onClick={() => onViewProductDetails(product.id)}
              >
                <div>
                  <h2 className="text-base font-semibold text-gray-800 h-12">{product.name}</h2>
                  <p className="text-sm text-gray-500">{product.brand}</p>
                </div>
                <p className="text-lg font-bold mt-2 text-right text-blue-700">{product.formattedPrice}</p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 mx-1 bg-gray-300 text-gray-800 rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-4 py-2">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 mx-1 bg-gray-300 text-gray-800 rounded disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600">No se encontraron productos en esta categoría.</p>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
