import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { ArrowLeft, Pause, Play, Check, Package, AlertTriangle, RotateCcw } from 'lucide-react';
import ModalFinalizacao from './ModalFinalizacao';
import ModalReconferencia from './ModalReconferencia';

export default function ConferenciaScreen({ carga, sessao, usuario, onVoltar, onLogout }) {
  const [cargaAtual, setCargaAtual] = useState(carga);
  const [sessaoAtual, setSessaoAtual] = useState(sessao);
  const [ean, setEan] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [ultimaLeitura, setUltimaLeitura] = useState(null);
  const [lastEnterTime, setLastEnterTime] = useState(0);
  const [showModalFinalizacao, setShowModalFinalizacao] = useState(false);
  const [showModalReconferencia, setShowModalReconferencia] = useState(false);
  const [itemReconferencia, setItemReconferencia] = useState(null);
  const [filtrarDiferencas, setFiltrarDiferencas] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('itens'); // 'itens' ou 'sobras'
  const [sobras, setSobras] = useState([]);
  const [showModalTrocarRecipiente, setShowModalTrocarRecipiente] = useState(false);
  const [recipientesDisponiveis, setRecipientesDisponiveis] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    carregarSobras();
    carregarRecipientes();
  }, []);

  const recarregarCarga = async () => {
    try {
      const response = await axios.get(`${API}/cargas/${carga.id}`);
      setCargaAtual(response.data);
    } catch (error) {
      console.error('Erro ao recarregar carga:', error);
    }
  };

  const carregarSobras = async () => {
    try {
      const response = await axios.get(`${API}/sobras/${sessao.id}`);
      setSobras(response.data);
    } catch (error) {
      console.error('Erro ao carregar sobras:', error);
    }
  };

  const carregarRecipientes = async () => {
    if (cargaAtual.tipo !== 'multi') return;
    
    try {
      const response = await axios.get(`${API}/cargas/${cargaAtual.id}/recipientes`);
      setRecipientesDisponiveis(response.data.recipientes || []);
    } catch (error) {
      console.error('Erro ao carregar recipientes:', error);
    }
  };

  const handleFinalizarRecipiente = async () => {
    if (!sessaoAtual.recipiente) {
      alert('Nenhum recipiente ativo');
      return;
    }

    if (!window.confirm(`Finalizar recipiente "${sessaoAtual.recipiente}"?`)) {
      return;
    }

    try {
      await axios.post(`${API}/sessoes/${sessaoAtual.id}/finalizar-recipiente`);
      
      // Atualizar sessão
      setSessaoAtual({...sessaoAtual, recipiente: null});
      
      // Recarregar lista de recipientes
      await carregarRecipientes();
      
      // Mostrar modal para selecionar próximo
      setShowModalTrocarRecipiente(true);
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao finalizar recipiente');
    }
  };

  const handleTrocarRecipiente = async (novoRecipiente) => {
    try {
      await axios.post(`${API}/sessoes/${sessaoAtual.id}/trocar-recipiente?novo_recipiente=${novoRecipiente}`);
      
      // Atualizar sessão e carga
      setSessaoAtual({...sessaoAtual, recipiente: novoRecipiente});
      await recarregarCarga();
      
      setShowModalTrocarRecipiente(false);
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao trocar recipiente');
    }
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      
      const now = Date.now();
      if (now - lastEnterTime < 150) {
        return;
      }
      setLastEnterTime(now);

      if (!ean.trim()) return;

      try {
        const response = await axios.post(
          `${API}/leituras?conferente_id=${usuario.id}`,
          {
            sessao_id: sessaoAtual.id,
            carga_id: cargaAtual.id,
            ean: ean.trim(),
            quantidade: quantidade
          }
        );
        
        setUltimaLeitura(response.data);
        await recarregarCarga();
        await carregarSobras();
        setEan('');
        setQuantidade(1);
        
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } catch (error) {
        alert('Erro ao registrar leitura');
      }
    }
  };

  const handlePausar = async () => {
    try {
      await axios.post(`${API}/sessoes/${sessaoAtual.id}/pausar?conferente_id=${usuario.id}`);
      setSessaoAtual({...sessaoAtual, status: 'pausada'});
      alert('Sessão pausada');
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao pausar sessão';
      alert(errorMsg);
      console.error('Erro ao pausar:', error);
    }
  };

  const handleRetomar = async () => {
    try {
      await axios.post(`${API}/sessoes/${sessaoAtual.id}/retomar`);
      setSessaoAtual({...sessaoAtual, status: 'ativa'});
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      alert('Erro ao retomar sessão');
    }
  };

  const handleFinalizar = async () => {
    // Se estiver pausada, perguntar se quer retomar
    if (sessaoAtual.status === 'pausada') {
      if (window.confirm('A carga está pausada. Deseja retomar e finalizar?')) {
        await handleRetomar();
        // Aguardar um pouco para o estado atualizar
        setTimeout(() => {
          setShowModalFinalizacao(true);
        }, 500);
      }
      return;
    }

    // Verificar se há pelo menos 1 item conferido
    const totalConferido = cargaAtual.itens.reduce((sum, item) => sum + item.quantidade_conferida, 0);
    if (totalConferido === 0) {
      alert('É necessário conferir pelo menos 1 item antes de finalizar.');
      return;
    }

    // Abrir modal de finalização
    setShowModalFinalizacao(true);
  };

  const handleReconferir = () => {
    setShowModalFinalizacao(false);
    setFiltrarDiferencas(true);
  };

  const handleAbrirReconferencia = (item) => {
    setItemReconferencia(item);
    setShowModalReconferencia(true);
  };

  const handleConfirmarReconferencia = async (item, novaQuantidade) => {
    try {
      // Atualizar diretamente a quantidade conferida no backend
      // Encontrar o índice do item na carga
      const itemIndex = cargaAtual.itens.findIndex(i => 
        i.codigo_produto === item.codigo_produto && 
        (cargaAtual.tipo === 'caixaria' || i.recipiente === item.recipiente)
      );
      
      if (itemIndex === -1) {
        alert('Item não encontrado');
        return;
      }

      // Criar cópia da carga e atualizar o item
      const cargaAtualizada = {...cargaAtual};
      cargaAtualizada.itens[itemIndex].quantidade_conferida = novaQuantidade;
      
      // Atualizar status
      const diferenca = cargaAtualizada.itens[itemIndex].quantidade - novaQuantidade;
      cargaAtualizada.itens[itemIndex].status = diferenca === 0 ? 'ok' : 'diferenca';

      // Atualizar no backend via endpoint de cargas
      await axios.put(`${API}/cargas/${cargaAtual.id}/item/${itemIndex}`, {
        quantidade_conferida: novaQuantidade,
        status: diferenca === 0 ? 'ok' : 'diferenca'
      });

      // Recarregar carga
      await recarregarCarga();
      setShowModalReconferencia(false);
      setItemReconferencia(null);
      alert('Reconferência registrada com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar reconferência:', error);
      alert('Erro ao registrar reconferência: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleFinalizarDefinitivo = async () => {
    try {
      await axios.post(`${API}/sessoes/${sessaoAtual.id}/finalizar`);
      setShowModalFinalizacao(false);
      
      // Voltar e mostrar sucesso
      onVoltar();
      setTimeout(() => {
        alert('Conferência finalizada com sucesso!');
      }, 100);
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      alert('Erro ao finalizar sessão: ' + (error.response?.data?.detail || error.message));
    }
  };

  const totalItens = cargaAtual.itens.length;
  const itensOk = cargaAtual.itens.filter(i => i.status === 'ok').length;
  const itensDiferenca = cargaAtual.itens.filter(i => i.status === 'diferenca').length;
  const totalConferido = cargaAtual.itens.reduce((sum, item) => sum + item.quantidade_conferida, 0);
  const progresso = totalItens > 0 ? (itensOk / totalItens * 100) : 0;
  
  // Filtrar itens se necessário
  let itensExibidos = cargaAtual.itens;
  
  // Para Multi-pedidos: filtrar apenas itens do recipiente ativo
  if (cargaAtual.tipo === 'multi' && sessaoAtual.recipiente) {
    itensExibidos = itensExibidos.filter(item => item.recipiente === sessaoAtual.recipiente);
  }
  
  // Aplicar filtro de diferenças se ativo
  if (filtrarDiferencas) {
    itensExibidos = itensExibidos.filter(item => item.quantidade !== item.quantidade_conferida);
  }
  
  // Habilitar finalizar apenas se houver sessão ativa e pelo menos 1 conferido
  const podeFinalizar = (sessaoAtual.status === 'ativa' || sessaoAtual.status === 'pausada') && totalConferido > 0;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-4 border-black p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={onVoltar} className="btn-outline p-2" data-testid="btn-voltar">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                Conferência: {cargaAtual.identificador_carga}
              </h1>
              <p className="text-sm mt-1">
                {cargaAtual.tipo === 'caixaria' ? 'Caixaria' : 'Multi-pedidos'} • {cargaAtual.data}
                {cargaAtual.tipo === 'multi' && sessaoAtual.recipiente && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 border border-blue-600 rounded font-semibold">
                    Recipiente: {sessaoAtual.recipiente}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {sessaoAtual.status === 'ativa' ? (
              <button onClick={handlePausar} className="btn-secondary flex items-center gap-2" data-testid="btn-pausar">
                <Pause size={20} />
                Pausar
              </button>
            ) : (
              <button onClick={handleRetomar} className="btn-primary flex items-center gap-2" data-testid="btn-retomar">
                <Play size={20} />
                Retomar
              </button>
            )}
            {cargaAtual.tipo === 'multi' && sessaoAtual.recipiente && (
              <button 
                onClick={handleFinalizarRecipiente} 
                className="btn-secondary flex items-center gap-2" 
                data-testid="btn-finalizar-recipiente"
              >
                <Package size={20} />
                Finalizar Recipiente
              </button>
            )}
            <button onClick={handleFinalizar} disabled={!podeFinalizar} className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" data-testid="btn-finalizar">
              <Check size={20} />
              Finalizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border-2 border-black p-4 rounded-lg">
            <p className="text-sm font-semibold mb-1">Progresso</p>
            <p className="text-3xl font-bold">{Math.round(progresso)}%</p>
          </div>
          <div className="border-2 border-green-600 p-4 rounded-lg bg-green-50">
            <p className="text-sm font-semibold mb-1 text-green-900">Conferidos OK</p>
            <p className="text-3xl font-bold text-green-700">{itensOk}</p>
          </div>
          <div className="border-2 border-red-600 p-4 rounded-lg bg-red-50">
            <p className="text-sm font-semibold mb-1 text-red-900">Diferenças</p>
            <p className="text-3xl font-bold text-red-700">{itensDiferenca}</p>
          </div>
          <div className="border-2 border-black p-4 rounded-lg">
            <p className="text-sm font-semibold mb-1">Total Itens</p>
            <p className="text-3xl font-bold">{totalItens}</p>
          </div>
        </section>

        {sessaoAtual.status === 'ativa' && (
          <section className="border-4 border-blue-600 p-6 rounded-lg bg-blue-50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package size={24} />
              Scanner EAN
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">Código EAN</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={ean}
                  onChange={(e) => setEan(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Bipe ou digite o EAN e pressione Enter"
                  className="w-full text-lg"
                  data-testid="input-ean"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Quantidade</label>
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full text-lg"
                  data-testid="input-quantidade"
                />
              </div>
            </div>

            {ultimaLeitura && (
              <div className={`mt-4 p-4 rounded border-2 ${
                ultimaLeitura.resultado === 'ok' ? 'border-green-600 bg-green-100' :
                ultimaLeitura.resultado === 'diferenca' ? 'border-red-600 bg-red-100' :
                'border-red-900 bg-red-200'
              }`} data-testid="ultima-leitura">
                <p className="font-bold">
                  {ultimaLeitura.resultado === 'ok' ? '✅ Leitura OK' :
                   ultimaLeitura.resultado === 'diferenca' ? '⚠️ Diferença detectada' :
                   '🚫 EAN fora da lista'}
                </p>
                <p className="text-sm mt-1">EAN: {ultimaLeitura.ean} • Qtd: {ultimaLeitura.quantidade}</p>
              </div>
            )}
          </section>
        )}

        <section className="border-2 border-black p-6 rounded-lg">
          {/* Abas */}
          <div className="flex border-b-2 border-black mb-4">
            <button
              onClick={() => setAbaAtiva('itens')}
              className={`px-6 py-3 font-bold transition-colors ${
                abaAtiva === 'itens'
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-black hover:bg-gray-300'
              }`}
              data-testid="aba-itens"
            >
              Itens da Carga ({cargaAtual.itens.length})
            </button>
            <button
              onClick={() => setAbaAtiva('sobras')}
              className={`px-6 py-3 font-bold transition-colors ${
                abaAtiva === 'sobras'
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-black hover:bg-gray-300'
              }`}
              data-testid="aba-sobras"
            >
              Sobras ({sobras.length})
            </button>
          </div>

          {abaAtiva === 'itens' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Itens da Carga</h2>
                {filtrarDiferencas && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-red-600">
                      Exibindo apenas itens com diferença ({itensExibidos.length})
                    </span>
                    <button
                      onClick={() => setFiltrarDiferencas(false)}
                      className="btn-outline text-sm"
                      data-testid="btn-mostrar-todos"
                    >
                      Mostrar Todos
                    </button>
                  </div>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table data-testid="itens-table">
              <thead>
                <tr>
                  {cargaAtual.tipo === 'multi' && <th>Recipiente</th>}
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Unidade</th>
                  <th>Esperado</th>
                  <th>Conferido</th>
                  <th>Dif.</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {itensExibidos.map((item, idx) => {
                  const diferenca = item.quantidade - item.quantidade_conferida;
                  return (
                    <tr
                      key={idx}
                      className={`${
                        item.status === 'ok' ? 'bg-green-100' :
                        item.status === 'diferenca' ? 'bg-red-100' :
                        ''
                      }`}
                      data-testid={`item-${idx}`}
                    >
                      {cargaAtual.tipo === 'multi' && <td className="font-semibold">{item.recipiente}</td>}
                      <td className="font-mono">{item.codigo_produto}</td>
                      <td>{item.descricao}</td>
                      <td className="text-center">{item.unidade}</td>
                      <td className="text-center font-semibold">{item.quantidade}</td>
                      <td className="text-center font-semibold">{item.quantidade_conferida}</td>
                      <td className="text-center">
                        {diferenca !== 0 && (
                          <span className={`font-bold px-2 py-1 rounded text-xs ${
                            diferenca > 0 ? 'bg-red-200 text-red-900' : 'bg-orange-200 text-orange-900'
                          }`}>
                            {diferenca > 0 ? `−${diferenca}` : `+${Math.abs(diferenca)}`}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`px-3 py-1 rounded text-sm font-semibold ${
                          item.status === 'ok' ? 'status-ok' :
                          item.status === 'diferenca' ? 'status-diferenca' :
                          'status-pendente'
                        }`}>
                          {item.status === 'ok' ? 'OK' :
                           item.status === 'diferenca' ? 'Diferença' : 'Pendente'}
                        </span>
                      </td>
                      <td>
                        {diferenca !== 0 && (
                          <button
                            onClick={() => handleAbrirReconferencia(item)}
                            className="text-blue-600 hover:text-blue-800 p-1 flex items-center gap-1 text-sm font-semibold"
                            data-testid={`btn-reconferir-${idx}`}
                          >
                            <RotateCcw size={16} />
                            Reconferir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {abaAtiva === 'sobras' && (
        <>
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">Sobras (EANs fora da lista)</h2>
            <p className="text-sm text-gray-600">
              EANs escaneados que não constam na lista da carga ou não pertencem ao recipiente atual.
            </p>
          </div>

          {sobras.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nenhuma sobra registrada nesta conferência</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table data-testid="sobras-table">
                <thead>
                  <tr>
                    {cargaAtual.tipo === 'multi' && <th>Recipiente</th>}
                    <th>EAN</th>
                    <th>Descrição</th>
                    <th>Quantidade</th>
                    <th>Última Leitura</th>
                  </tr>
                </thead>
                <tbody>
                  {sobras.map((sobra, idx) => (
                    <tr key={idx} className="bg-red-50" data-testid={`sobra-${idx}`}>
                      {cargaAtual.tipo === 'multi' && (
                        <td className="font-semibold">{sobra.recipiente || '-'}</td>
                      )}
                      <td className="font-mono font-bold">{sobra.ean}</td>
                      <td>{sobra.descricao || 'Produto não cadastrado'}</td>
                      <td className="text-center font-semibold">{sobra.quantidade}</td>
                      <td className="text-sm">
                        {sobra.ultima_leitura
                          ? new Date(sobra.ultima_leitura).toLocaleString('pt-BR')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
        </section>
      </main>

      {/* Modais */}
      {showModalFinalizacao && (
        <ModalFinalizacao
          carga={cargaAtual}
          onClose={() => setShowModalFinalizacao(false)}
          onReconferir={handleReconferir}
          onFinalizarDefinitivo={handleFinalizarDefinitivo}
        />
      )}

      {showModalReconferencia && itemReconferencia && (
        <ModalReconferencia
          item={itemReconferencia}
          carga={cargaAtual}
          onClose={() => {
            setShowModalReconferencia(false);
            setItemReconferencia(null);
          }}
          onConfirmar={handleConfirmarReconferencia}
        />
      )}
    </div>
  );
}
