import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';

const AnalyticsTracker = () => {
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const track = async () => {
            try {
                if (isAuthenticated) {
                    await apiService.recordVisit(location.pathname);
                }
            } catch (error) {
                // Silent fail to not disrupt user experience
                console.error("Tracking error", error);
            }
        };
        track();
    }, [location, isAuthenticated]);

    return null;
};

export default AnalyticsTracker;
