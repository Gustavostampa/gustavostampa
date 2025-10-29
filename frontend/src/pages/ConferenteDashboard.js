import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { LogOut, Calendar, Package, RefreshCw } from 'lucide-react';
import ConferenciaScreen from '../components/ConferenciaScreen';
import ModalIniciarConferencia from '../components/ModalIniciarConferencia';
import ModalSelecionarRecipiente from '../components/ModalSelecionarRecipiente';

/**
 * Normaliza a resposta da API para sempre retornar um array de cargas
 * Aceita diferentes formatos: array direto, objeto com propriedade "cargas", ou null/undefined
 */
function toArrayCargas(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.cargas)) return data.cargas;
  return [];
}

export default function ConferenteDashboard({ usuario, onLogout }) {
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState('caixaria');
  const [cargas, setCargas] = useState([]);
  const [cargaSelecionada, setCargaSelecionada] = useState(null);
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const [atualizando, setAtualizando] = useState(false);
  const [showModalRecipiente, setShowModalRecipiente] = useState(false);
  const [showModalIniciar, setShowModalIniciar] = useState(false);
  const [cargaParaIniciar, setCargaParaIniciar] = useState(null);
  const [recipienteSelecionado, setRecipienteSelecionado] = useState(null);
  const [sessaoPausada, setSessaoPausada] = useState(null);
  const [ocultarFinalizadas, setOcultarFinalizadas] = useState(true);
  const syncIntervalRef = useRef(null);

  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    setDataSelecionada(hoje);
    verificarSessaoAtiva();
    
    // Auto-sync a cada 60 segundos
    syncIntervalRef.current = setInterval(() => {
      // Só atualiza se não estiver em uma conferência E se houver data selecionada
      if (!cargaSelecionada && dataSelecionada) {
        carregarCargas(true);
      }
    }, 60000);
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [dataSelecionada, cargaSelecionada]); // Adicionar dependências

  useEffect(() => {
    if (dataSelecionada && !cargaSelecionada) {
      carregarCargas();
    }
  }, [dataSelecionada, tipoSelecionado]);

  const verificarSessaoAtiva = async () => {
    try {
      const response = await axios.get(`${API}/sessoes/ativa/${usuario.id}`);
      if (response.data) {
        if (response.data.status === 'pausada') {
          setSessaoPausada(response.data);
        } else {
          setSessaoAtiva(response.data);
          const cargaResponse = await axios.get(`${API}/cargas/${response.data.carga_id}`);
          setCargaSelecionada(cargaResponse.data);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sessão ativa:', error);
      // Se não tiver sessão ativa, limpa o estado
      setSessaoAtiva(null);
      setSessaoPausada(null);
      setCargaSelecionada(null);
    }
  };

  const carregarCargas = async (silent = false) => {
    if (!silent) setAtualizando(true);
    try {
      console.log('[ConferenteDashboard] Carregando cargas:', { data: dataSelecionada, tipo: tipoSelecionado });
      
      const response = await axios.get(`${API}/cargas`, {
        params: { data: dataSelecionada, tipo: tipoSelecionado }
      });
      
      console.log('[ConferenteDashboard] Resposta da API:', response.data);
      
      // Normalizar resposta para array
      const cargasArray = toArrayCargas(response.data);
      
      console.log('[ConferenteDashboard] Cargas normalizadas:', cargasArray.length, 'cargas');
      
      setCargas(cargasArray);
      setUltimaAtualizacao(new Date());
    } catch (error) {
      console.error('[ConferenteDashboard] Erro ao carregar cargas:', error);
      // Em caso de erro, garantir que cargas seja um array vazio
      setCargas([]);
    } finally {
      if (!silent) setAtualizando(false);
    }
  };

  const handleAtualizarCargas = () => {
    carregarCargas();
  };

  const handleIniciarCarga = (carga) => {
    setCargaParaIniciar(carga);
    
    // Se for Multi, abrir modal de recipiente primeiro
    if (carga.tipo === 'multi') {
      setShowModalRecipiente(true);
    } else {
      // Se for Caixaria, abrir direto modal de confirmação
      setShowModalIniciar(true);
    }
  };

  const handleConfirmarRecipiente = (recipiente) => {
    setRecipienteSelecionado(recipiente);
    setShowModalRecipiente(false);
    setShowModalIniciar(true);
  };

  const handleConfirmarInicio = async () => {
    try {
      const payload = {
        carga_id: cargaParaIniciar.id
      };
      
      if (recipienteSelecionado) {
        payload.recipiente = recipienteSelecionado;
      }

      const response = await axios.post(`${API}/sessoes?conferente_id=${usuario.id}`, payload);
      setSessaoAtiva(response.data);
      setCargaSelecionada(cargaParaIniciar);
      setShowModalIniciar(false);
      setCargaParaIniciar(null);
      setRecipienteSelecionado(null);
      
      // Atualizar cargas após iniciar
      carregarCargas(true);
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao iniciar carga');
    }
  };

  const handleCancelarInicio = () => {
    setShowModalIniciar(false);
    setShowModalRecipiente(false);
    setCargaParaIniciar(null);
    setRecipienteSelecionado(null);
  };

  const handleContinuarConferencia = async (carga) => {
    try {
      // Buscar a sessão pausada/ativa deste conferente para esta carga
      const response = await axios.get(`${API}/sessoes/ativa/${usuario.id}`);
      
      if (!response.data) {
        alert('Nenhuma sessão encontrada para esta carga');
        return;
      }
      
      const sessao = response.data;
      
      // Se a sessão está pausada, retomar
      if (sessao.status === 'pausada') {
        await axios.post(`${API}/sessoes/${sessao.id}/retomar`);
        // Buscar sessão atualizada
        const sessaoAtualizada = await axios.get(`${API}/sessoes/${sessao.id}`);
        setSessaoAtiva(sessaoAtualizada.data);
        setSessaoPausada(null);
      } else {
        // Sessão já está ativa
        setSessaoAtiva(sessao);
      }
      
      // Carregar dados da carga
      const cargaResponse = await axios.get(`${API}/cargas/${sessao.carga_id}`);
      setCargaSelecionada(cargaResponse.data);
      
    } catch (error) {
      console.error('Erro ao continuar conferência:', error);
      alert(error.response?.data?.detail || 'Erro ao continuar conferência');
    }
  };

  const handleVoltarLista = () => {
    setCargaSelecionada(null);
    setSessaoAtiva(null);
    carregarCargas();
  };

  const formatarHora = (data) => {
    if (!data) return '--:--:--';
    return new Date(data).toLocaleTimeString('pt-BR');
  };

  if (cargaSelecionada && sessaoAtiva) {
    return (
      <ConferenciaScreen
        carga={cargaSelecionada}
        sessao={sessaoAtiva}
        usuario={usuario}
        onVoltar={handleVoltarLista}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-4 border-black p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>Painel do Conferente</h1>
            <p className="text-sm mt-1">Bem-vindo, {usuario.nome}</p>
          </div>
          <button onClick={onLogout} className="btn-outline flex items-center gap-2" data-testid="btn-logout">
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <section className="border-2 border-black p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar size={24} />
            Selecionar Data e Tipo
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Data</label>
              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="w-full"
                data-testid="input-data"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">Tipo de Carga</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo"
                    value="caixaria"
                    checked={tipoSelecionado === 'caixaria'}
                    onChange={(e) => setTipoSelecionado(e.target.value)}
                    data-testid="radio-caixaria"
                    className="w-5 h-5"
                  />
                  <span className="font-semibold">Caixaria</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo"
                    value="multi"
                    checked={tipoSelecionado === 'multi'}
                    onChange={(e) => setTipoSelecionado(e.target.value)}
                    data-testid="radio-multi"
                    className="w-5 h-5"
                  />
                  <span className="font-semibold">Multi-pedidos</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="border-2 border-black p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package size={24} />
              Cargas Disponíveis
            </h2>
            <div className="flex items-center gap-3">
              {ultimaAtualizacao && (
                <span className="text-sm text-gray-600">
                  Última atualização: {formatarHora(ultimaAtualizacao)}
                </span>
              )}
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={ocultarFinalizadas}
                  onChange={(e) => setOcultarFinalizadas(e.target.checked)}
                  className="w-4 h-4"
                  data-testid="checkbox-ocultar-finalizadas"
                />
                <span className="font-semibold">Ocultar finalizadas</span>
              </label>
              <button
                onClick={handleAtualizarCargas}
                disabled={atualizando}
                className="btn-outline flex items-center gap-2 text-sm disabled:opacity-50"
                data-testid="btn-atualizar-cargas"
              >
                <RefreshCw size={18} className={atualizando ? 'animate-spin' : ''} />
                {atualizando ? 'Atualizando...' : 'Atualizar Cargas'}
              </button>
            </div>
          </div>
          
          {cargas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nenhuma carga encontrada para esta data e tipo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Array.isArray(cargas) ? cargas : [])
                .filter(carga => !ocultarFinalizadas || carga.status !== 'finalizada')
                .map((carga) => {
                const totalItens = carga.itens?.length || 0;
                const itensConferidos = (carga.itens || []).filter(i => i.status !== 'pendente').length;
                const progresso = totalItens > 0 ? (itensConferidos / totalItens * 100) : 0;

                return (
                  <div
                    key={carga.id}
                    className="border-2 border-black p-4 rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`carga-${carga.identificador_carga}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{carga.identificador_carga}</h3>
                        <p className="text-sm text-gray-600">Data: {carga.data}</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        carga.status === 'finalizada' ? 'status-ok' :
                        carga.status === 'em_andamento' ? 'status-pendente' :
                        carga.status === 'pausada' ? 'bg-yellow-200 text-yellow-900' :
                        'bg-gray-300 text-black'
                      }`}>
                        {carga.status === 'finalizada' ? 'Finalizada' :
                         carga.status === 'em_andamento' ? 'Em Andamento' :
                         carga.status === 'pausada' ? 'Pausada' : 'Aguardando'}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progresso</span>
                        <span className="font-semibold">{Math.round(progresso)}%</span>
                      </div>
                      <div className="bg-gray-200 h-4 rounded overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all"
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm mb-4">
                      <span>Total de itens: <strong>{totalItens}</strong></span>
                      <span>Conferidos: <strong>{itensConferidos}</strong></span>
                    </div>
                    
                    {carga.status === 'aguardando' && (
                      <button
                        onClick={() => handleIniciarCarga(carga)}
                        className="btn-primary w-full"
                        data-testid={`btn-iniciar-${carga.identificador_carga}`}
                      >
                        Iniciar Conferência
                      </button>
                    )}
                    
                    {(carga.status === 'em_andamento' || carga.status === 'pausada') && carga.conferente_id === usuario.id && (
                      <button
                        onClick={() => handleContinuarConferencia(carga)}
                        className="btn-secondary w-full"
                        data-testid={`btn-continuar-${carga.identificador_carga}`}
                      >
                        Continuar Conferência
                      </button>
                    )}
                    
                    {carga.status === 'finalizada' && (
                      <button
                        className="btn-outline w-full cursor-not-allowed opacity-50"
                        disabled
                      >
                        Conferência Finalizada
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modais */}
      {showModalRecipiente && cargaParaIniciar && (
        <ModalSelecionarRecipiente
          carga={cargaParaIniciar}
          onConfirmar={handleConfirmarRecipiente}
          onCancel={handleCancelarInicio}
        />
      )}

      {showModalIniciar && cargaParaIniciar && (
        <ModalIniciarConferencia
          carga={cargaParaIniciar}
          recipiente={recipienteSelecionado}
          sessaoPausada={sessaoPausada}
          onConfirmar={handleConfirmarInicio}
          onCancel={handleCancelarInicio}
        />
      )}
    </div>
  );
}
