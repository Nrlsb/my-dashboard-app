import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';

const PRODUCTS_PER_PAGE = 20;

const CategoryPage = () => {
  const { groupCode } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
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
        const data = await apiService.fetchProductsByGroup(
          groupCode,
          currentPage
        );

        setProducts(data.products);
        setGroupName(data.groupName);
        setTotalPages(Math.ceil(data.totalProducts / PRODUCTS_PER_PAGE));
        setError(null);
      } catch (err) {
        setError(
          `No se pudieron cargar los productos para el grupo ${groupCode}.`
        );
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

  const handleViewProductDetails = (productId) => {
    navigate(`/product-detail/${productId}`);
  };

  if (loading) {
    return <LoadingSpinner text="Cargando productos..." />;
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>;
  }

  const displayName = groupName || groupCode;
  const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://espint.com.ar';

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Catálogo', item: `${SITE_URL}/catalogo` },
      { '@type': 'ListItem', position: 2, name: displayName, item: `${SITE_URL}/category/${groupCode}` },
    ],
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <SEOHead
        title={displayName}
        description={`Explorá los productos de ${displayName} en Distribuidora Espint. Amplio stock disponible con envíos a todo el país.`}
        canonical={`/category/${groupCode}`}
        jsonLd={breadcrumbJsonLd}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-400 flex items-center gap-1">
        <Link
          to={isAuthenticated ? '/dashboard' : '/catalogo'}
          className="hover:text-espint-blue transition-colors"
        >
          Catálogo
        </Link>
        <span>/</span>
        <span className="text-gray-600">{displayName}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-2 text-gray-800">
        <span className="text-blue-600">{displayName}</span>
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Productos de <strong>{displayName}</strong> disponibles en Distribuidora Espint.
        {!isAuthenticated && ' Iniciá sesión para ver precios y realizar pedidos.'}
      </p>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="border p-4 rounded-lg shadow-md bg-white flex flex-col justify-between cursor-pointer"
                onClick={() => handleViewProductDetails(product.id)}
              >
                <div>
                  <h2 className="text-base font-semibold text-gray-800 h-12">
                    {product.name}
                  </h2>
                  <p className="text-sm text-gray-500">{product.brand}</p>
                </div>
                {isAuthenticated ? (
                  <p className="text-lg font-bold mt-2 text-right text-blue-700">
                    {product.formattedPrice}
                  </p>
                ) : (
                  <p className="text-sm font-medium mt-2 text-right text-blue-500 italic">
                    Inicie sesión para ver precios
                  </p>
                )}
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
          <p className="text-gray-600">
            No se encontraron productos en esta categoría.
          </p>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
