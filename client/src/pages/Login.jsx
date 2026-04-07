import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      api.defaults.headers['x-admin-token'] = token;
      await api.get('/admin/config');
      login(token);
      navigate('/');
    } catch {
      setError('Token inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Admin Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Token</label>
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
              required className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Cole o token aqui" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded font-medium transition">
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-gray-400 text-xs mt-4 text-center">
          Gere um token pelo endpoint <code className="bg-gray-700 px-1 rounded">POST /api/admin/login</code> com o body {'{"email": "seu@email.com"}'}
        </p>
      </div>
    </div>
  );
}
