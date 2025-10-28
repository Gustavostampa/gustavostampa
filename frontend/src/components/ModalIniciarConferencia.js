import { X, AlertTriangle } from 'lucide-react';

export default function ModalIniciarConferencia({ carga, recipiente, sessaoPausada, onConfirmar, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Confirmar Início de Conferência</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-lg mb-4">Tem certeza de que deseja iniciar a conferência desta carga?</p>
          
          <div className="border-2 border-black p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">Carga</p>
                <p className="text-lg font-bold">{carga.identificador_carga}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Data</p>
                <p className="text-lg font-bold">{carga.data}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Tipo</p>
                <p className="text-lg font-bold capitalize">{carga.tipo === 'caixaria' ? 'Caixaria' : 'Multi-pedidos'}</p>
              </div>
              {recipiente && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Recipiente</p>
                  <p className="text-lg font-bold text-blue-700">{recipiente}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {sessaoPausada && (
          <div className="bg-yellow-50 border-2 border-yellow-600 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-bold text-yellow-900 mb-1">Atenção: Você possui 1 carga pausada</p>
                <p className="text-sm text-yellow-800">
                  Prosseguir manterá a carga pausada e iniciará uma nova sessão.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-outline" data-testid="btn-cancelar-inicio">
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="btn-primary"
            data-testid="btn-confirmar-inicio"
          >
            Iniciar Conferência
          </button>
        </div>
      </div>
    </div>
  );
}
