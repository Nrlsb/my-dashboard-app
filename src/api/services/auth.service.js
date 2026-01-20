import apiClient from '../core/client';

export const authService = {
    login(credentials) {
        return apiClient.post('/login', credentials);
    },

    register(userData) {
        return apiClient.post('/register', userData);
    },

    fetchUserProfile() {
        return apiClient.get('/profile');
    },

    updateUserProfile(profileData) {
        return apiClient.put('/profile', profileData);
    },

    changePassword(newPassword) {
        return apiClient.put('/change-password', { newPassword });
    },
};
