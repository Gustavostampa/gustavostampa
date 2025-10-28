import { useState, useRef, useEffect } from 'react';
import { X, Package } from 'lucide-react';

export default function ModalReconferencia({ item, carga, onClose, onConfirmar }) {
  const [novoConferido, setNovoConferido] = useState(item.quantidade_conferida);
  const [ean, setEan] = useState('');
  const [lastEnterTime, setLastEnterTime] = useState(0);
  const inputRef = useRef(null);

  const diferenca = item.quantidade - novoConferido;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      
      const now = Date.now();
      if (now - lastEnterTime < 150) {
        return;
      }
      setLastEnterTime(now);

      if (!ean.trim()) return;

      // Adicionar 1 ao conferido
      setNovoConferido(prev => prev + 1);
      setEan('');
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleConfirmar = () => {
    onConfirmar(item, novoConferido);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Reconferir Item</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded" data-testid="btn-close-reconferencia">
            <X size={24} />
          </button>
        </div>

        {/* Informações do Item */}
        <div className="border-2 border-black p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Código</p>
              <p className="text-lg font-mono font-bold">{item.codigo_produto}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">EAN</p>
              <p className="text-lg font-mono">{item.ean || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-semibold text-gray-600">Descrição</p>
              <p className="text-lg">{item.descricao}</p>
            </div>
            {carga.tipo === 'multi' && item.recipiente && (
              <div>
                <p className="text-sm font-semibold text-gray-600">Recipiente</p>
                <p className="text-lg font-bold">{item.recipiente}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resumo Atual */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border-2 border-gray-400 p-3 rounded-lg text-center">
            <p className="text-sm font-semibold text-gray-600">Planejado</p>
            <p className="text-2xl font-bold">{item.quantidade}</p>
          </div>
          <div className="border-2 border-blue-600 p-3 rounded-lg text-center bg-blue-50">
            <p className="text-sm font-semibold text-blue-900">Novo Conferido</p>
            <p className="text-2xl font-bold text-blue-700">{novoConferido}</p>
          </div>
          <div className={`border-2 p-3 rounded-lg text-center ${
            diferenca === 0 ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'
          }`}>
            <p className="text-sm font-semibold">Diferença</p>
            <p className={`text-2xl font-bold ${diferenca === 0 ? 'text-green-700' : 'text-red-700'}`}>
              {diferenca === 0 ? '✓' : (diferenca > 0 ? `−${diferenca}` : `+${Math.abs(diferenca)}`)}
            </p>
          </div>
        </div>

        {/* Opções de Recontar */}
        <div className="bg-blue-50 border-2 border-blue-600 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Package size={20} className="text-blue-600" />
            <h3 className="font-bold text-blue-900">Opção A: Recontar por Leitura (Preferencial)</h3>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            Bipe novamente para somar conferências deste item. Cada Enter/Tab adiciona +1.
          </p>
          <input
            ref={inputRef}
            type="text"
            value={ean}
            onChange={(e) => setEan(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Bipe ou digite o EAN e pressione Enter"
            className="w-full"
            data-testid="input-ean-reconferencia"
            autoFocus
          />
        </div>

        <div className="bg-gray-50 border-2 border-gray-400 p-4 rounded-lg mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Opção B: Ajustar Manualmente</h3>
          <p className="text-sm text-gray-700 mb-3">
            Use apenas quando não for possível bipar novamente.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold">Quantidade Conferida:</label>
            <input
              type="number"
              value={novoConferido}
              onChange={(e) => setNovoConferido(parseInt(e.target.value) || 0)}
              min="0"
              className="w-32"
              data-testid="input-manual-reconferencia"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-outline" data-testid="btn-cancelar-reconferencia">
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            className="btn-primary"
            data-testid="btn-confirmar-reconferencia"
          >
            Confirmar Ajuste
          </button>
        </div>
      </div>
    </div>
  );
}
