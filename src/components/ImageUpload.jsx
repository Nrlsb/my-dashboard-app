import React, { useState } from 'react';
import apiService from '../api/apiService';

const ImageUpload = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState(null);
    const [errors, setErrors] = useState(null);
    const [generalError, setGeneralError] = useState(null);

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
        setResults(null);
        setErrors(null);
        setGeneralError(null);
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            setGeneralError('Please select at least one file.');
            return;
        }

        setUploading(true);
        setResults(null);
        setErrors(null);
        setGeneralError(null);

        const formData = new FormData();
        files.forEach((file) => {
            formData.append('images', file);
        });

        try {
            const data = await apiService.uploadImages(formData);
            setResults(data.results);
            setErrors(data.errors);
        } catch (err) {
            console.error('Upload error:', err);
            setGeneralError(err.message || 'Failed to upload images.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md space-y-4">
            <h2 className="text-xl font-bold text-gray-900">AI Product Image Upload</h2>
            <p className="text-gray-600">Upload images to automatically assign them to products using Gemini AI.</p>

            <div className="flex flex-col space-y-4">
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
                />

                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{files.length} file(s) selected</span>
                    <button
                        onClick={handleUpload}
                        disabled={uploading || files.length === 0}
                        className={`px-4 py-2 rounded text-white font-bold ${uploading || files.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {uploading ? 'Processing...' : 'Upload & Identify'}
                    </button>
                </div>
            </div>

            {generalError && (
                <div className="p-4 bg-red-100 text-red-700 rounded border border-red-200">
                    <strong>Error:</strong> {generalError}
                </div>
            )}

            {results && results.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-green-700">Successful Uploads ({results.length})</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {results.map((res, index) => (
                            <div key={index} className="p-3 bg-green-50 text-green-800 rounded border border-green-200 flex items-center space-x-4">
                                <img src={res.image.image_url} alt={res.productCode} className="w-16 h-16 object-cover rounded" />
                                <div>
                                    <p className="font-bold">{res.productCode}</p>
                                    <p className="text-xs">{res.file}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {errors && errors.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-red-700">Failed Uploads ({errors.length})</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {errors.map((err, index) => (
                            <div key={index} className="p-3 bg-red-50 text-red-800 rounded border border-red-200">
                                <p className="font-bold">{err.file}</p>
                                <p className="text-sm">{err.error}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
