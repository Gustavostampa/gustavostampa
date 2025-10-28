import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import GestorDashboard from './pages/GestorDashboard';
import ConferenteDashboard from './pages/ConferenteDashboard';
import { Toaster } from 'sonner';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

axios.interceptors.request.use(config => {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  if (usuario.id) {
    config.headers['X-Usuario-Id'] = usuario.id;
  }
  return config;
});

function App() {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('usuario');
    if (usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo));
    }
    setLoading(false);
  }, []);

  const handleLogin = (user) => {
    localStorage.setItem('usuario', JSON.stringify(user));
    setUsuario(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Carregando...</div>;
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={usuario ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/" 
            element={
              !usuario ? <Navigate to="/login" /> :
              usuario.perfil === 'gestor' ? <GestorDashboard usuario={usuario} onLogout={handleLogout} /> :
              <ConferenteDashboard usuario={usuario} onLogout={handleLogout} />
            } 
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
