import { useState } from 'react';
import { X, Package } from 'lucide-react';

export default function ModalSelecionarRecipiente({ carga, onConfirmar, onCancel }) {
  const [recipienteSelecionado, setRecipienteSelecionado] = useState('');

  // Extrair recipientes únicos da carga
  const recipientes = [...new Set(carga.itens.map(item => item.recipiente).filter(Boolean))].sort();

  const handleConfirmar = () => {
    if (!recipienteSelecionado) {
      alert('Selecione um recipiente');
      return;
    }
    onConfirmar(recipienteSelecionado);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Selecionar Recipiente</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-4">
            Para Multi-pedidos, você deve selecionar um recipiente antes de iniciar a conferência.
            Apenas os produtos deste recipiente serão exibidos.
          </p>

          <div className="border-2 border-black p-4 rounded-lg mb-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-600">Carga</p>
                <p className="font-bold">{carga.identificador_carga}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Total Recipientes</p>
                <p className="font-bold">{recipientes.length}</p>
              </div>
            </div>
          </div>

          <label className="block text-sm font-bold mb-2">
            <Package size={18} className="inline mr-2" />
            Recipiente *
          </label>
          <select
            value={recipienteSelecionado}
            onChange={(e) => setRecipienteSelecionado(e.target.value)}
            className="w-full text-lg"
            data-testid="select-recipiente"
          >
            <option value="">Selecione um recipiente</option>
            {recipientes.map((rec) => (
              <option key={rec} value={rec}>
                {rec}
              </option>
            ))}
          </select>

          {recipienteSelecionado && (
            <div className="mt-4 bg-blue-50 border-2 border-blue-600 p-3 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">
                Itens no recipiente "{recipienteSelecionado}": {
                  carga.itens.filter(i => i.recipiente === recipienteSelecionado).length
                }
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-outline" data-testid="btn-cancelar-recipiente">
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!recipienteSelecionado}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-confirmar-recipiente"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
