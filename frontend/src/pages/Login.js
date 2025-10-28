import { useState } from 'react';
import axios from 'axios';
import { API } from '../App';

export default function Login({ onLogin }) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, { login, senha });
      onLogin(response.data);
    } catch (error) {
      setErro(error.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="border-4 border-black p-8 rounded-lg">
          <h1 className="text-3xl font-bold text-center mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            Stampa Confere
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2" htmlFor="login">
                Login
              </label>
              <input
                id="login"
                data-testid="input-login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2" htmlFor="senha">
                Senha
              </label>
              <input
                id="senha"
                data-testid="input-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full"
                required
              />
            </div>

            {erro && (
              <div className="bg-red-100 border-2 border-red-600 p-3 rounded" data-testid="erro-login">
                <p className="text-red-900 text-sm font-semibold">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              data-testid="btn-login"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Usuário padrão: <strong>admin</strong></p>
            <p>Senha padrão: <strong>admin123</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
