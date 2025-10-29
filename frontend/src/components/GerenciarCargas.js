import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Eye, Search, RefreshCw } from 'lucide-react';
import VisualizarCarga from './VisualizarCarga';
import { API } from '../App';

export default function GerenciarCargas({ onVoltar }) {
  const [cargas, setCargas] = useState([]);
  const [filtros, setFiltros] = useState({ data: '', tipo: '', status: '' });
  const [cargaSelecionada, setCargaSelecionada] = useState(null);
  const [showVisualizarCarga, setShowVisualizarCarga] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    carregarCargas();
  }, [filtros]);

  const carregarCargas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Construir params apenas com valores não vazios
      const params = {};
      if (filtros.data) params.dataInicio = filtros.data;
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.status) params.status = filtros.status;

      console.log('[Frontend] Carregando cargas...');
      console.log('[Frontend] Filtros:', filtros);
      console.log('[Frontend] Params enviados:', params);
      console.log('[Frontend] URL:', `${API}/api/cargas`);
      
      const response = await axios.get(`${API}/api/cargas`, { params });
      console.log('[Frontend] Resposta recebida:', response.data);
      
      // A resposta tem formato { total, page, pageSize, cargas }
      if (response.data.cargas) {
        console.log('[Frontend] Total:', response.data.total);
        console.log('[Frontend] Cargas recebidas:', response.data.cargas.length);
        setCargas(response.data.cargas);
        setTotal(response.data.total);
      } else {
        console.warn('[Frontend] Formato inesperado, usando array direto');
        setCargas(response.data);
        setTotal(response.data.length);
      }
    } catch (error) {
      console.error('[Frontend] Erro ao carregar cargas:', error);
      console.error('[Frontend] Detalhes:', error.response?.data);
      setError('Falha ao carregar as cargas. Tente novamente.');
      setCargas([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleVisualizarCarga = async (cargaId) => {
    try {
      const response = await axios.get(`${API}/api/cargas/${cargaId}`);
      setCargaSelecionada(response.data);
      setShowVisualizarCarga(true);
    } catch (error) {
      console.error('Erro ao carregar carga:', error);
      alert('Erro ao carregar detalhes da carga');
    }
  };

  const handleVoltarVisualizacao = () => {
    setShowVisualizarCarga(false);
    setCargaSelecionada(null);
    carregarCargas();
  };

  if (showVisualizarCarga && cargaSelecionada) {
    return <VisualizarCarga carga={cargaSelecionada} onVoltar={handleVoltarVisualizacao} />;
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <header className="border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onVoltar}
            className="btn-outline flex items-center gap-2"
            data-testid="btn-voltar"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Cargas</h1>
            <p className="text-sm text-gray-600">Visualize e edite os itens das cargas importadas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2">Data</label>
            <input
              type="date"
              value={filtros.data}
              onChange={(e) => setFiltros({ ...filtros, data: e.target.value })}
              data-testid="filter-data"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Tipo</label>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              data-testid="filter-tipo"
            >
              <option value="">Todos</option>
              <option value="caixaria">Caixaria</option>
              <option value="multi">Multi-pedidos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Status</label>
            <select
              value={filtros.status}
              onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
              data-testid="filter-status"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="pausada">Pausada</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => setFiltros({ data: '', tipo: '', status: '' })}
              className="btn-outline flex-1"
              data-testid="btn-limpar-filtros"
            >
              Limpar Filtros
            </button>
            <button
              onClick={carregarCargas}
              disabled={loading}
              className="btn-primary flex items-center gap-2 flex-1"
              data-testid="btn-recarregar"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Recarregar
            </button>
          </div>
        </div>
      </header>

      <section className="border-2 border-black p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Cargas ({cargas.length})</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin mx-auto mb-4 w-12 h-12 border-4 border-black border-t-transparent rounded-full"></div>
            <p className="text-gray-600">Carregando cargas...</p>
          </div>
        ) : cargas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Search size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nenhuma carga encontrada</p>
            <p className="text-sm mt-2">Verifique os filtros ou importe novas cargas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table data-testid="cargas-table">
              <thead>
                <tr>
                  <th>Identificador</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Conferente</th>
                  <th>Total Itens</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {cargas.map((carga, idx) => (
                  <tr key={carga.id} data-testid={`carga-${idx}`}>
                    <td className="font-semibold">{carga.identificador_carga}</td>
                    <td>{carga.data}</td>
                    <td className="capitalize">{carga.tipo === 'caixaria' ? 'Caixaria' : 'Multi-pedidos'}</td>
                    <td>
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${
                        carga.status === 'finalizada' ? 'bg-green-100 text-green-800' :
                        carga.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                        carga.status === 'pausada' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {carga.status === 'finalizada' ? 'Finalizada' :
                         carga.status === 'em_andamento' ? 'Em Andamento' :
                         carga.status === 'pausada' ? 'Pausada' : 'Pendente'}
                      </span>
                    </td>
                    <td className="text-sm">{carga.conferente_nome || carga.conferente_id || '-'}</td>
                    <td className="text-center font-semibold">{carga.total_itens || carga.itens?.length || 0}</td>
                    <td className="text-center">
                      <button
                        onClick={() => handleVisualizarCarga(carga.id)}
                        className="btn-primary flex items-center gap-2 text-sm mx-auto"
                        data-testid={`btn-visualizar-${idx}`}
                      >
                        <Eye size={16} />
                        Ver/Editar Itens
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
