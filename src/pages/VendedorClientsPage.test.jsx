import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import VendedorClientsPage from './VendedorClientsPage';
import { AuthProvider } from '../context/AuthContext';
import apiService from '../api/apiService';

// Mock apiService
vi.mock('../api/apiService');

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', async () => {
    const actual = await vi.importActual('../context/AuthContext');
    return {
        ...actual,
        useAuth: () => mockUseAuth(),
    };
});

// Mock Lucide icons to avoid issues during testing
vi.mock('lucide-react', () => ({
    ChevronDown: () => <span data-testid="chevron-down">ChevronDown</span>,
    ChevronUp: () => <span data-testid="chevron-up">ChevronUp</span>,
    Phone: () => <span data-testid="phone-icon">Phone</span>,
    Mail: () => <span data-testid="mail-icon">Mail</span>,
}));

describe('VendedorClientsPage', () => {
    const mockClients = [
        {
            id: 1,
            full_name: 'Juan Perez',
            email: 'juan@example.com',
            a1_cod: 'C001',
            a1_loja: 'L01',
            a1_cgc: '123456789',
            a1_tel: '555-1234',
            a1_endereco: 'Calle Falsa 123',
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        mockUseAuth.mockReturnValue({ user: { role: 'vendedor' } });
        apiService.getVendedorClients.mockResolvedValue([]);
        render(<VendedorClientsPage />);
        expect(screen.getByText('Cargando clientes...')).toBeInTheDocument();
    });

    it('renders clients list for vendor', async () => {
        mockUseAuth.mockReturnValue({ user: { role: 'vendedor' } });
        apiService.getVendedorClients.mockResolvedValue(mockClients);

        render(<VendedorClientsPage />);

        await waitFor(() => {
            expect(screen.getByText('Mis Clientes')).toBeInTheDocument();
            expect(screen.getByText('Juan Perez')).toBeInTheDocument();
            expect(screen.getByText('juan@example.com')).toBeInTheDocument();
            expect(screen.getByText('555-1234')).toBeInTheDocument();
        });
    });

    it('toggles details on mobile', async () => {
        mockUseAuth.mockReturnValue({ user: { role: 'vendedor' } });
        apiService.getVendedorClients.mockResolvedValue(mockClients);

        render(<VendedorClientsPage />);

        await waitFor(() => {
            expect(screen.getByText('Juan Perez')).toBeInTheDocument();
        });

        // Check for "Ver detalles +" button (mobile only feature)
        const detailsButton = screen.getByText('Ver detalles +');
        expect(detailsButton).toBeInTheDocument();

        // Initially, technical fields should be hidden (have 'hidden' class)
        // Note: Testing classes is a bit fragile, but we want to verify the logic.
        // We can check if the element with "Dirección:" text has the hidden class.
        const addressLabel = screen.getByText('Dirección:');
        const addressCell = addressLabel.closest('td');
        expect(addressCell).toHaveClass('hidden');

        // Click to expand
        fireEvent.click(detailsButton);

        // Now it should be block
        expect(addressCell).toHaveClass('block');

        // Check if ChevronUp is shown (indicating expansion)
        // We need to find the button that toggles. The "Ver detalles +" button disappears when expanded.
        // So we check if "Ver detalles +" is gone.
        expect(screen.queryByText('Ver detalles +')).not.toBeInTheDocument();
    });
});
