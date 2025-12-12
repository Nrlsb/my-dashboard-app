import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiService from '../api/apiService';

const AnalyticsTracker = () => {
    const location = useLocation();

    useEffect(() => {
        const track = async () => {
            try {
                await apiService.recordVisit(location.pathname);
            } catch (error) {
                // Silent fail to not disrupt user experience
                console.error("Tracking error", error);
            }
        };
        track();
    }, [location]);

    return null;
};

export default AnalyticsTracker;
