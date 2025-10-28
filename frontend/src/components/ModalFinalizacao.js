import { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';

export default function ModalFinalizacao({ carga, onClose, onReconferir, onFinalizarDefinitivo }) {
  const [loading, setLoading] = useState(false);

  // Calcular resumo
  const itensComDiferenca = carga.itens.filter(item => {
    const diferenca = item.quantidade - item.quantidade_conferida;
    return diferenca !== 0;
  });

  const itensOk = carga.itens.filter(i => i.status === 'ok').length;
  const itensDifMais = carga.itens.filter(i => i.quantidade_conferida > i.quantidade).length;
  const itensDifMenos = carga.itens.filter(i => i.quantidade_conferida < i.quantidade && i.quantidade_conferida > 0).length;
  const itensNaoConferidos = carga.itens.filter(i => i.quantidade_conferida === 0).length;

  const handleFinalizarDefinitivo = async () => {
    setLoading(true);
    await onFinalizarDefinitivo();
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Finalizar Conferência</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded" data-testid="btn-close-finalizacao">
            <X size={24} />
          </button>
        </div>

        {/* Resumo Geral */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border-2 border-green-600 p-4 rounded-lg bg-green-50">
            <p className="text-sm font-semibold text-green-900">Conferidos OK</p>
            <p className="text-3xl font-bold text-green-700">{itensOk}</p>
          </div>
          <div className="border-2 border-orange-600 p-4 rounded-lg bg-orange-50">
            <p className="text-sm font-semibold text-orange-900">Dif. a Mais</p>
            <p className="text-3xl font-bold text-orange-700">{itensDifMais}</p>
          </div>
          <div className="border-2 border-red-600 p-4 rounded-lg bg-red-50">
            <p className="text-sm font-semibold text-red-900">Dif. a Menos</p>
            <p className="text-3xl font-bold text-red-700">{itensDifMenos}</p>
          </div>
          <div className="border-2 border-gray-600 p-4 rounded-lg bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">Não Conferidos</p>
            <p className="text-3xl font-bold text-gray-700">{itensNaoConferidos}</p>
          </div>
        </div>

        {/* Tabela de Diferenças */}
        {itensComDiferenca.length > 0 ? (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={24} className="text-red-600" />
              <h3 className="text-lg font-bold text-red-600">
                Itens com Diferença ({itensComDiferenca.length})
              </h3>
            </div>
            <div className="border-2 border-red-600 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="text-sm">
                <thead>
                  <tr>
                    {carga.tipo === 'multi' && <th>Recipiente</th>}
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Planejado</th>
                    <th>Conferido</th>
                    <th>Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {itensComDiferenca.map((item, idx) => {
                    const diferenca = item.quantidade - item.quantidade_conferida;
                    return (
                      <tr key={idx} className="bg-red-50">
                        {carga.tipo === 'multi' && <td className="font-semibold">{item.recipiente}</td>}
                        <td className="font-mono">{item.codigo_produto}</td>
                        <td>{item.descricao}</td>
                        <td className="text-center font-semibold">{item.quantidade}</td>
                        <td className="text-center font-semibold">{item.quantidade_conferida}</td>
                        <td className="text-center">
                          <span className={`font-bold ${diferenca > 0 ? 'text-red-700' : 'text-orange-700'}`}>
                            {diferenca > 0 ? `−${diferenca}` : `+${Math.abs(diferenca)}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="border-2 border-green-600 p-6 rounded-lg bg-green-50 mb-6 text-center">
            <Check size={48} className="mx-auto mb-3 text-green-600" />
            <p className="text-lg font-bold text-green-900">
              Todos os itens conferidos corretamente!
            </p>
          </div>
        )}

        {/* Aviso e Ações */}
        {itensComDiferenca.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-600 p-4 rounded-lg mb-6">
            <p className="text-sm text-yellow-900 font-semibold">
              ⚠️ Você ainda tem diferenças. Deseja reconferir agora ou finalizar definitivamente?
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-outline" data-testid="btn-cancelar-finalizacao">
            Cancelar
          </button>
          {itensComDiferenca.length > 0 && (
            <button
              onClick={onReconferir}
              className="btn-secondary"
              data-testid="btn-reconferir-diferencas"
            >
              Reconferir Itens com Diferença
            </button>
          )}
          <button
            onClick={handleFinalizarDefinitivo}
            disabled={loading}
            className="btn-primary"
            data-testid="btn-finalizar-definitivo"
          >
            {loading ? 'Finalizando...' : 'Finalizar Definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
}
