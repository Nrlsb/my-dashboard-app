import { useState, useEffect } from 'react';

const useDolar = () => {
    const [dolar, setDolar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDolar = async () => {
            try {
                const [oficialRes, mayoristaRes] = await Promise.all([
                    fetch('https://dolarapi.com/v1/dolares/oficial'),
                    fetch('https://dolarapi.com/v1/dolares/mayorista')
                ]);

                if (!oficialRes.ok || !mayoristaRes.ok) {
                    throw new Error('Error al obtener la cotización del dólar');
                }

                const oficialData = await oficialRes.json();
                const mayoristaData = await mayoristaRes.json();

                setDolar({
                    billetes: oficialData,
                    divisas: mayoristaData
                });
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
