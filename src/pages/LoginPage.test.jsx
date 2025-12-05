import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock de los hooks y contextos
const { mockLogin, mockNavigate } = vi.hoisted(() => {
  return {
    mockLogin: vi.fn(),
    mockNavigate: vi.fn(),
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock del logo
vi.mock('../assets/espintBlanco.svg', () => ({
  default: 'logo.svg',
}));

describe('LoginPage', () => {
  let LoginPage;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to ensure mocks are initialized
    LoginPage = (await import('./LoginPage')).default;
  });

  it('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingresar/i })).toBeInTheDocument();
  });

  it('handles user input', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('calls login function on form submission', async () => {
    mockLogin.mockResolvedValue({ success: true });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Ingresar/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays error message on login failure', async () => {
    mockLogin.mockImplementation(() => Promise.resolve({ success: false, message: 'Credenciales inválidas' }));

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /Ingresar/i });
    fireEvent.click(submitButton);

    try {
      await screen.findByText('Credenciales inválidas');
    } catch (error) {
      console.log('Specific error not found, checking generic error...');
      try {
        await screen.findByText(/Ocurrió un error/);
        console.log('Generic error found!');
      } catch (e) {
        console.log('No error message found.');
        screen.debug();
      }
      throw error;
    }
  });
});
