import { useState, useEffect } from 'react';

const useDolar = () => {
    const [dolar, setDolar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDolar = async () => {
            try {
                const response = await fetch('https://dolarapi.com/v1/dolares/oficial');
                if (!response.ok) {
                    throw new Error('Error al obtener la cotización del dólar');
                }
                const data = await response.json();
                setDolar(data);
            } catch (err) {
                console.error('Error fetching dolar:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDolar();
    }, []);

    return { dolar, loading, error };
};

export default useDolar;
