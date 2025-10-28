import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import ImportModal from '../components/ImportModal';
import UsuariosModal from '../components/UsuariosModal';
import ProdutosScreen from './ProdutosScreen';
import { LogOut, Upload, Users, BarChart3, Trash2, RefreshCw, Package } from 'lucide-react';

export default function GestorDashboard({ usuario, onLogout }) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const [showProdutos, setShowProdutos] = useState(false);
  const [importType, setImportType] = useState(null);
  const [stats, setStats] = useState([]);
  const [filtros, setFiltros] = useState({ data: '', tipo: '', conferente_id: '' });
  const [usuarios, setUsuarios] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('tempo-real'); // 'tempo-real' ou 'finalizados'
  const [sessoesFinalizadas, setSessoesFinalizadas] = useState([]);

  useEffect(() => {
    if (!showProdutos) {
      if (abaAtiva === 'tempo-real') {
        carregarStats();
      } else {
        carregarSessoesFinalizadas();
      }
      carregarUsuarios();
    }
  }, [filtros, showProdutos, abaAtiva]);

  const carregarStats = async () => {
    try {
      const params = {};
      if (filtros.data) params.data = filtros.data;
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.conferente_id) params.conferente_id = filtros.conferente_id;
      
      const response = await axios.get(`${API}/dashboard/estatisticas`, { params });
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const carregarSessoesFinalizadas = async () => {
    try {
      const params = { status: 'finalizada', limit: 100 };
      if (filtros.data) params.data_inicio = filtros.data;
      if (filtros.conferente_id) params.conferente_id = filtros.conferente_id;
      
      const response = await axios.get(`${API}/sessoes`, { params });
      
      // Buscar dados das cargas para cada sessão
      const sessoesComCargas = await Promise.all(
        response.data.map(async (sessao) => {
          try {
            const cargaResp = await axios.get(`${API}/cargas/${sessao.carga_id}`);
            return { ...sessao, carga: cargaResp.data };
          } catch (error) {
            console.error('Erro ao buscar carga:', error);
            return { ...sessao, carga: null };
          }
        })
      );
      
      setSessoesFinalizadas(sessoesComCargas);
    } catch (error) {
      console.error('Erro ao carregar sessões finalizadas:', error);
    }
  };

  const carregarUsuarios = async () => {
    try {
      const response = await axios.get(`${API}/usuarios`);
      setUsuarios(response.data.filter(u => u.perfil === 'conferente'));
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleOpenImport = (type) => {
    setImportType(type);
    setShowImportModal(true);
  };

  const handleLimparDados = async () => {
    if (!window.confirm('Tem certeza? Conferências offline finalizadas serão removidas.')) {
      return;
    }
    
    try {
      await axios.post(`${API}/admin/limpar-dados`);
      alert('Dados limpos com sucesso!');
      carregarStats();
    } catch (error) {
      alert('Erro ao limpar dados');
    }
  };

  const handleResetar = async () => {
    const senha = prompt('Digite a senha administrativa:');
    if (!senha) return;
    
    if (!window.confirm('ATENÇÃO: Todas as tabelas locais serão apagadas. Confirma?')) {
      return;
    }
    
    try {
      await axios.post(`${API}/admin/resetar`, { senha_admin: senha });
      alert('Banco resetado com sucesso!');
      carregarStats();
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao resetar banco');
    }
  };

  if (showProdutos) {
    return <ProdutosScreen onVoltar={() => setShowProdutos(false)} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-4 border-black p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>Painel do Gestor</h1>
            <p className="text-sm mt-1">Bem-vindo, {usuario.nome}</p>
          </div>
          <button onClick={onLogout} className="btn-outline flex items-center gap-2" data-testid="btn-logout">
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-4">
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => handleOpenImport('produtos')}
            className="btn-primary p-3 flex items-center justify-center gap-2 text-sm"
            data-testid="btn-import-produtos"
          >
            <Upload size={18} />
            <span>Produtos</span>
          </button>
          
          <button
            onClick={() => handleOpenImport('caixaria')}
            className="btn-primary p-3 flex items-center justify-center gap-2 text-sm"
            data-testid="btn-import-caixaria"
          >
            <Upload size={18} />
            <span>Caixaria</span>
          </button>
          
          <button
            onClick={() => handleOpenImport('multi')}
            className="btn-primary p-3 flex items-center justify-center gap-2 text-sm"
            data-testid="btn-import-multi"
          >
            <Upload size={18} />
            <span>Multi-pedidos</span>
          </button>
          
          <button
            onClick={() => setShowProdutos(true)}
            className="btn-primary p-3 flex items-center justify-center gap-2 text-sm"
            data-testid="btn-produtos"
          >
            <Package size={18} />
            <span>Produtos</span>
          </button>
          
          <button
            onClick={() => setShowUsuariosModal(true)}
            className="btn-secondary p-3 flex items-center justify-center gap-2 text-sm"
            data-testid="btn-usuarios"
          >
            <Users size={18} />
            <span>Usuários</span>
          </button>
          
          <button
            onClick={carregarStats}
            className="btn-outline p-3 flex items-center justify-center gap-2 text-sm"
            data-testid="btn-refresh"
          >
            <RefreshCw size={18} />
            <span>Atualizar</span>
          </button>
        </section>

        {/* Abas */}
        <div className="flex border-b-2 border-black">
          <button
            onClick={() => setAbaAtiva('tempo-real')}
            className={`px-6 py-3 font-bold transition-colors ${
              abaAtiva === 'tempo-real'
                ? 'bg-black text-white'
                : 'bg-gray-200 text-black hover:bg-gray-300'
            }`}
            data-testid="aba-tempo-real"
          >
            Painel Tempo Real
          </button>
          <button
            onClick={() => setAbaAtiva('finalizados')}
            className={`px-6 py-3 font-bold transition-colors ${
              abaAtiva === 'finalizados'
                ? 'bg-black text-white'
                : 'bg-gray-200 text-black hover:bg-gray-300'
            }`}
            data-testid="aba-finalizados"
          >
            Finalizados
          </button>
        </div>

        {abaAtiva === 'tempo-real' && (
          <section className="border-2 border-black p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={24} />
            Painel Tempo Real
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold mb-2">Data</label>
              <input
                type="date"
                value={filtros.data}
                onChange={(e) => setFiltros({...filtros, data: e.target.value})}
                data-testid="filter-data"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">Tipo</label>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros({...filtros, tipo: e.target.value})}
                data-testid="filter-tipo"
              >
                <option value="">Todos</option>
                <option value="caixaria">Caixaria</option>
                <option value="multi">Multi-pedidos</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">Conferente</label>
              <select
                value={filtros.conferente_id}
                onChange={(e) => setFiltros({...filtros, conferente_id: e.target.value})}
                data-testid="filter-conferente"
              >
                <option value="">Todos</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setFiltros({ data: '', tipo: '', conferente_id: '' })}
                className="btn-outline w-full"
                data-testid="btn-clear-filters"
              >
                Limpar Filtros
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table data-testid="stats-table">
              <thead>
                <tr>
                  <th>Identificador</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Progresso</th>
                  <th>OK</th>
                  <th>Diferenças</th>
                  <th>Total</th>
                  <th>Conferente</th>
                  <th>Tempo (min)</th>
                </tr>
              </thead>
              <tbody>
                {stats.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-8 text-gray-500">
                      Nenhuma carga encontrada
                    </td>
                  </tr>
                ) : (
                  stats.map((stat, idx) => (
                    <tr key={idx} data-testid={`stat-row-${idx}`}>
                      <td className="font-semibold">{stat.identificador_carga}</td>
                      <td>{stat.data}</td>
                      <td className="capitalize">{stat.tipo}</td>
                      <td>
                        <span className={`px-3 py-1 rounded text-sm font-semibold ${
                          stat.status === 'finalizada' ? 'status-ok' :
                          stat.status === 'em_andamento' ? 'status-pendente' :
                          'bg-gray-300 text-black'
                        }`}>
                          {stat.status === 'finalizada' ? 'Finalizada' :
                           stat.status === 'em_andamento' ? 'Em Andamento' :
                           stat.status === 'pausada' ? 'Pausada' : 'Aguardando'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 h-6 rounded overflow-hidden">
                            <div
                              className="bg-blue-600 h-full transition-all"
                              style={{ width: `${stat.progresso}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">{stat.progresso}%</span>
                        </div>
                      </td>
                      <td className="text-center font-semibold text-green-700">{stat.itens_ok}</td>
                      <td className="text-center font-semibold text-red-700">{stat.itens_diferenca}</td>
                      <td className="text-center font-semibold">{stat.total_itens}</td>
                      <td>{stat.conferente}</td>
                      <td className="text-center">{stat.tempo_minutos || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {abaAtiva === 'finalizados' && (
          <section className="border-2 border-black p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 size={24} />
              Sessões Finalizadas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold mb-2">Data</label>
                <input
                  type="date"
                  value={filtros.data}
                  onChange={(e) => setFiltros({...filtros, data: e.target.value})}
                  data-testid="filter-data-finalizados"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Conferente</label>
                <select
                  value={filtros.conferente_id}
                  onChange={(e) => setFiltros({...filtros, conferente_id: e.target.value})}
                  data-testid="filter-conferente-finalizados"
                >
                  <option value="">Todos</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => setFiltros({ data: '', tipo: '', conferente_id: '' })}
                  className="btn-outline w-full"
                  data-testid="btn-clear-filters-finalizados"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table data-testid="finalizados-table">
                <thead>
                  <tr>
                    <th>Identificador</th>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Conferente</th>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Duração</th>
                    <th>Itens OK</th>
                    <th>Diferenças</th>
                    <th>Sobras</th>
                  </tr>
                </thead>
                <tbody>
                  {sessoesFinalizadas.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-8 text-gray-500">
                        Nenhuma sessão finalizada encontrada
                      </td>
                    </tr>
                  ) : (
                    sessoesFinalizadas.map((sessao, idx) => {
                      if (!sessao.carga) return null;
                      
                      const itensOk = sessao.carga.itens.filter(i => i.status === 'ok').length;
                      const itensDif = sessao.carga.itens.filter(i => i.status === 'diferenca').length;
                      
                      // Calcular duração
                      let duracao = '-';
                      if (sessao.inicio && sessao.fim) {
                        const inicio = new Date(sessao.inicio);
                        const fim = new Date(sessao.fim);
                        const diffMs = fim - inicio;
                        const diffMin = Math.floor(diffMs / 60000);
                        duracao = `${diffMin}min`;
                      }
                      
                      return (
                        <tr key={idx} data-testid={`sessao-finalizada-${idx}`}>
                          <td className="font-semibold">{sessao.carga.identificador_carga}</td>
                          <td>{sessao.carga.data}</td>
                          <td className="capitalize">{sessao.carga.tipo}</td>
                          <td>{usuarios.find(u => u.id === sessao.conferente_id)?.nome || '-'}</td>
                          <td className="text-sm">
                            {sessao.inicio ? new Date(sessao.inicio).toLocaleTimeString('pt-BR') : '-'}
                          </td>
                          <td className="text-sm">
                            {sessao.fim ? new Date(sessao.fim).toLocaleTimeString('pt-BR') : '-'}
                          </td>
                          <td className="text-center">{duracao}</td>
                          <td className="text-center font-semibold text-green-700">{itensOk}</td>
                          <td className="text-center font-semibold text-red-700">{itensDif}</td>
                          <td className="text-center">-</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="flex gap-4">
          <button
            onClick={handleLimparDados}
            className="btn-outline flex items-center gap-2"
            data-testid="btn-limpar-dados"
          >
            <Trash2 size={20} />
            Limpar Dados Locais
          </button>
          
          <button
            onClick={handleResetar}
            className="btn-outline flex items-center gap-2"
            data-testid="btn-resetar"
          >
            <RefreshCw size={20} />
            Resetar Banco Completo
          </button>
        </section>
      </main>

      {showImportModal && (
        <ImportModal
          type={importType}
          onClose={() => {
            setShowImportModal(false);
            carregarStats();
          }}
        />
      )}

      {showUsuariosModal && (
        <UsuariosModal
          onClose={() => {
            setShowUsuariosModal(false);
            carregarUsuarios();
          }}
        />
      )}
    </div>
  );
}
