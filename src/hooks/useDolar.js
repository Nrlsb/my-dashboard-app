import { useState, useEffect } from 'react';
import apiService from '../api/apiService';

const useDolar = () => {
    const [dolar, setDolar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDolar = async () => {
            try {
                // Use backend endpoint instead of external API
                const rates = await apiService.getExchangeRates();

                setDolar({
                    billetes: { venta: rates.venta_billete },
                    divisas: { venta: rates.venta_divisa }
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
