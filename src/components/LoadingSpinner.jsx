import React from 'react';

const LoadingSpinner = ({ text = 'Cargando...' }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] w-full bg-transparent p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-espint-blue mb-4 shadow-sm"></div>
            <div className="text-xl font-semibold text-espint-blue animate-pulse">{text}</div>
        </div>
    );
};

export default LoadingSpinner;
