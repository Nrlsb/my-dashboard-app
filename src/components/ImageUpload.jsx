import React, { useState } from 'react';
import IndividualImageUpload from './IndividualImageUpload';

import BulkAIUpload from './BulkAIUpload';
import BatchDescriptionGenerator from './BatchDescriptionGenerator';

const ImageUpload = () => {
    const [activeTab, setActiveTab] = useState('manual');

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-espint-blue mb-6">Gestión de Catálogo</h1>

            <div className="flex space-x-4 mb-6 border-b border-gray-200">
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'manual' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('manual')}
                >
                    Subida Manual / Individual
                </button>
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'ai_upload' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('ai_upload')}
                >
                    Subida Masiva IA
                </button>
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'ai_description' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('ai_description')}
                >
                    Generación Masiva IA
                </button>
            </div>

            {activeTab === 'manual' && <IndividualImageUpload />}
            {activeTab === 'ai_upload' && <BulkAIUpload />}
            {activeTab === 'ai_description' && <BatchDescriptionGenerator />}
        </div>
    );
};

export default ImageUpload;
