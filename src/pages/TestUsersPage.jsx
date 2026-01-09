import React from 'react';
import TestUserManager from '../components/TestUserManager';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const TestUsersPage = () => {
    const navigate = useNavigate();

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 text-gray-600 hover:text-blue-600 flex items-center gap-2 transition-colors"
                >
                    <FaArrowLeft /> Volver
                </button>
                <TestUserManager />
            </div>
        </div>
    );
};

export default TestUsersPage;
