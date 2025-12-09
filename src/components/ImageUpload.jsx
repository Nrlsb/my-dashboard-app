import React, { useState } from 'react';
import axios from 'axios';

const ImageUpload = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResult(null);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        setUploading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('image', file);

        try {
            // Adjust the URL if your backend is on a different port/host
            const response = await axios.post('/api/images/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setResult(response.data);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.error || 'Failed to upload image.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-md space-y-4">
            <h2 className="text-xl font-bold text-gray-900">AI Product Image Upload</h2>
            <p className="text-gray-600">Upload an image to automatically assign it to a product using Gemini AI.</p>

            <div className="flex flex-col space-y-2">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
                />

                <button
                    onClick={handleUpload}
                    disabled={uploading || !file}
                    className={`px-4 py-2 rounded text-white font-bold ${uploading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {uploading ? 'Processing...' : 'Upload & Identify'}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {result && (
                <div className="p-4 bg-green-100 text-green-700 rounded space-y-2">
                    <p><strong>Success!</strong> {result.message}</p>
                    <p><strong>Identified Product:</strong> {result.productCode}</p>
                    {result.image && (
                        <div className="mt-2">
                            <p className="text-sm">Image assigned to product.</p>
                            <img src={result.image.image_url} alt="Uploaded" className="mt-2 w-full h-auto rounded shadow" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
