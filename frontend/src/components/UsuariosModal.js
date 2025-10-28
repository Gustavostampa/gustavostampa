import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { X, Plus, Trash2 } from 'lucide-react';

export default function UsuariosModal({ onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    login: '',
    senha: '',
    perfil: 'conferente'
  });

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const response = await axios.get(`${API}/usuarios`);
      setUsuarios(response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/usuarios`, formData);
      alert('Usuário criado com sucesso!');
      setFormData({ nome: '', login: '', senha: '', perfil: 'conferente' });
      setShowForm(false);
      carregarUsuarios();
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao criar usuário');
    }
  };

  const handleDelete = async (usuarioId) => {
    if (!window.confirm('Deseja realmente desativar este usuário?')) {
      return;
    }

    try {
      await axios.delete(`${API}/usuarios/${usuarioId}`);
      alert('Usuário desativado com sucesso!');
      carregarUsuarios();
    } catch (error) {
      alert('Erro ao desativar usuário');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded" data-testid="btn-close-usuarios">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
            data-testid="btn-novo-usuario"
          >
            <Plus size={20} />
            Novo Usuário
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="border-2 border-black p-4 rounded-lg mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  data-testid="input-nome"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Login</label>
                <input
                  type="text"
                  value={formData.login}
                  onChange={(e) => setFormData({...formData, login: e.target.value})}
                  required
                  data-testid="input-login-novo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Senha</label>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({...formData, senha: e.target.value})}
                  required
                  data-testid="input-senha-novo"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Perfil</label>
                <select
                  value={formData.perfil}
                  onChange={(e) => setFormData({...formData, perfil: e.target.value})}
                  data-testid="select-perfil"
                >
                  <option value="conferente">Conferente</option>
                  <option value="gestor">Gestor</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" data-testid="btn-salvar-usuario">
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-outline"
                data-testid="btn-cancelar-usuario"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="border-2 border-black rounded-lg overflow-hidden">
          <table data-testid="usuarios-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    Nenhum usuário cadastrado
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => (
                  <tr key={usuario.id} data-testid={`usuario-${usuario.login}`}>
                    <td className="font-semibold">{usuario.nome}</td>
                    <td>{usuario.login}</td>
                    <td className="capitalize">{usuario.perfil}</td>
                    <td>
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${
                        usuario.ativo ? 'status-ok' : 'bg-gray-400 text-white'
                      }`}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      {usuario.login !== 'admin' && usuario.ativo && (
                        <button
                          onClick={() => handleDelete(usuario.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                          data-testid={`btn-delete-${usuario.login}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
