import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';

export default function VisualizarCarga({ carga, onVoltar }) {
  const [cargaAtual, setCargaAtual] = useState(carga);
  const [itemParaExcluir, setItemParaExcluir] = useState(null);
  const [showModalConfirmacao, setShowModalConfirmacao] = useState(false);

  const handleExcluirItem = (item, index) => {
    setItemParaExcluir({ item, index });
    setShowModalConfirmacao(true);
  };

  const confirmarExclusao = async () => {
    if (!itemParaExcluir) return;

    try {
      const response = await axios.delete(
        `${API}/cargas/${cargaAtual.id}/itens/${itemParaExcluir.index}`
      );

      // Remover item localmente
      const novosItens = cargaAtual.itens.filter((_, idx) => idx !== itemParaExcluir.index);
      setCargaAtual({ ...cargaAtual, itens: novosItens });

      toast.success('Item excluído com sucesso');
      setShowModalConfirmacao(false);
      setItemParaExcluir(null);
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error(error.response?.data?.detail || 'Erro ao excluir item');
    }
  };

  const podeExcluir = cargaAtual.status !== 'finalizada';

  return (
    <div className="min-h-screen bg-white p-6">
      <header className="border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onVoltar}
              className="btn-outline flex items-center gap-2"
              data-testid="btn-voltar"
            >
              <ArrowLeft size={20} />
              Voltar
            </button>
            <div>
              <h1 className="text-2xl font-bold">
                Carga: {cargaAtual.identificador_carga}
              </h1>
              <p className="text-sm text-gray-600">
                {cargaAtual.tipo === 'caixaria' ? 'Caixaria' : 'Multi-pedidos'} • 
                {cargaAtual.data} • 
                Status: <span className="font-semibold capitalize">{cargaAtual.status}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {!podeExcluir && (
        <div className="bg-yellow-50 border-2 border-yellow-600 p-4 rounded-lg mb-6 flex items-center gap-3">
          <AlertTriangle size={24} className="text-yellow-600" />
          <div>
            <p className="font-bold">Carga Finalizada</p>
            <p className="text-sm">Não é possível excluir itens de cargas finalizadas.</p>
          </div>
        </div>
      )}

      <section className="border-2 border-black p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            Itens da Carga ({cargaAtual.itens.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table data-testid="itens-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                {cargaAtual.tipo === 'multi' && <th>Recipiente</th>}
                <th>EAN</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                <th>Status</th>
                {podeExcluir && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {cargaAtual.itens.length === 0 ? (
                <tr>
                  <td colSpan={podeExcluir ? (cargaAtual.tipo === 'multi' ? 8 : 7) : (cargaAtual.tipo === 'multi' ? 7 : 6)} className="text-center py-8 text-gray-500">
                    Nenhum item nesta carga
                  </td>
                </tr>
              ) : (
                cargaAtual.itens.map((item, idx) => (
                  <tr key={idx} data-testid={`item-${idx}`}>
                    <td className="font-mono">{item.codigo_produto}</td>
                    <td>{item.descricao}</td>
                    {cargaAtual.tipo === 'multi' && (
                      <td className="font-semibold">{item.recipiente || '-'}</td>
                    )}
                    <td className="font-mono text-sm">{item.ean || '-'}</td>
                    <td className="text-center">{item.unidade}</td>
                    <td className="text-center font-semibold">{item.quantidade}</td>
                    <td className="text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.status === 'ok' 
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'diferenca'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    {podeExcluir && (
                      <td className="text-center">
                        <button
                          onClick={() => handleExcluirItem(item, idx)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                          title="Excluir item"
                          data-testid={`btn-excluir-${idx}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModalConfirmacao && itemParaExcluir && (
        <div className="modal-overlay" onClick={() => setShowModalConfirmacao(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={32} className="text-red-600" />
              <h2 className="text-xl font-bold">Confirmar Exclusão</h2>
            </div>

            <p className="mb-4">
              Deseja realmente excluir este item da carga?
            </p>

            <div className="bg-gray-50 border border-gray-300 p-3 rounded mb-6">
              <p className="text-sm font-semibold">Código: {itemParaExcluir.item.codigo_produto}</p>
              <p className="text-sm">Descrição: {itemParaExcluir.item.descricao}</p>
              <p className="text-sm">Quantidade: {itemParaExcluir.item.quantidade}</p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModalConfirmacao(false)}
                className="btn-outline"
                data-testid="btn-cancelar"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-2"
                data-testid="btn-confirmar-exclusao"
              >
                <Trash2 size={18} />
                Excluir Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
