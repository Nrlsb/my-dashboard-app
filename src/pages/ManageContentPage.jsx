import React, { useState, Suspense, lazy } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

const GeneralTab = lazy(() => import('../components/ManageContent/GeneralTab'));
const AccessoriesTab = lazy(() => import('../components/ManageContent/AccessoriesTab'));
const GroupsTab = lazy(() => import('../components/ManageContent/GroupsTab'));
const ReportsTab = lazy(() => import('../components/ManageContent/ReportsTab'));
const ConnectionsTab = lazy(() => import('../components/ManageContent/ConnectionsTab'));

const ManageContentPage = () => {
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-espint-blue mb-6">Gestionar Contenido</h1>

            <div className="flex space-x-4 mb-6 border-b border-gray-200 overflow-x-auto whitespace-nowrap pb-1">
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'general' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('general')}
                >
                    <span className="md:hidden">General</span>
                    <span className="hidden md:inline">General</span>
                </button>
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'accessories' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('accessories')}
                >
                    <span className="md:hidden">Accesorios</span>
                    <span className="hidden md:inline">Accesorios</span>
                </button>
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'groups' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('groups')}
                >
                    <span className="md:hidden">Grupos</span>
                    <span className="hidden md:inline">Grupos de Productos</span>
                </button>
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'reports' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('reports')}
                >
                    <span className="md:hidden">Reportes</span>
                    <span className="hidden md:inline">Reportes y Análisis</span>
                </button>
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'connections' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('connections')}
                >
                    <span className="md:hidden">Conexiones</span>
                    <span className="hidden md:inline">Conexiones</span>
                </button>
            </div>

            <Suspense fallback={<LoadingSpinner />}>
                {activeTab === 'general' && <GeneralTab />}
                {activeTab === 'accessories' && <AccessoriesTab />}
                {activeTab === 'groups' && <GroupsTab />}
                {activeTab === 'reports' && <ReportsTab />}
                {activeTab === 'connections' && <ConnectionsTab />}
            </Suspense>
        </div>
    );
};

export default ManageContentPage;
