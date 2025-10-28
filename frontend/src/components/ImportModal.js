import { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';

export default function ImportModal({ type, onClose }) {
  const [file, setFile] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acao, setAcao] = useState('substituir');

  const titles = {
    produtos: 'Importar Produtos',
    caixaria: 'Importar Cargas de Caixaria',
    multi: 'Importar Cargas Multi-pedidos'
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResultado(null);
  };

  const handleImport = async () => {
    if (!file) {
      alert('Selecione um arquivo');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('acao', acao);

    try {
      const endpoint = type === 'produtos' ? '/importar/produtos' :
                      type === 'caixaria' ? '/importar/caixaria' :
                      '/importar/multi';
      
      const response = await axios.post(`${API}${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setResultado(response.data);
      
      if (response.data.duplicados && response.data.duplicados.length > 0 && acao === 'substituir') {
        alert(`${response.data.duplicados.length} registros duplicados foram substituídos`);
      }
    } catch (error) {
      alert('Erro ao importar arquivo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarAcao = async (novaAcao) => {
    setAcao(novaAcao);
    setResultado(null);
    setFile(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{titles[type]}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded" data-testid="btn-close-modal">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2">Selecionar Arquivo Excel</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="w-full"
              data-testid="input-file"
            />
          </div>

          {resultado && resultado.duplicados && resultado.duplicados.length > 0 && (
            <div className="border-2 border-amber-600 bg-amber-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 mb-2">Duplicidades Encontradas</h3>
                  <p className="text-sm text-amber-800 mb-3">
                    {resultado.duplicados.length} registros já existem no sistema. O que deseja fazer?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleConfirmarAcao('substituir')}
                      className="btn-secondary text-sm"
                      data-testid="btn-substituir"
                    >
                      Substituir
                    </button>
                    <button
                      onClick={() => handleConfirmarAcao('ignorar')}
                      className="btn-outline text-sm"
                      data-testid="btn-ignorar"
                    >
                      Ignorar
                    </button>
                    <button
                      onClick={onClose}
                      className="btn-outline text-sm"
                      data-testid="btn-cancelar"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {resultado && (
            <div className="border-2 border-black p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={24} className="text-green-600" />
                <h3 className="font-bold text-lg">Resultado da Importação</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-gray-300 p-3 rounded">
                  <p className="text-sm text-gray-600">Registros Processados</p>
                  <p className="text-2xl font-bold">{resultado.total_processados || resultado.total_cargas || 0}</p>
                </div>
                <div className="border border-gray-300 p-3 rounded">
                  <p className="text-sm text-gray-600">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{resultado.erros?.length || 0}</p>
                </div>
              </div>

              {resultado.erros && resultado.erros.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-bold text-sm mb-2 text-red-600">Erros Encontrados:</h4>
                  <div className="bg-red-50 border border-red-300 p-3 rounded max-h-32 overflow-y-auto">
                    {resultado.erros.map((erro, idx) => (
                      <p key={idx} className="text-sm text-red-800">{erro}</p>
                    ))}
                  </div>
                </div>
              )}

              {resultado.preview && resultado.preview.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-2">Preview (primeiras 50 linhas):</h4>
                  <div className="border border-gray-300 rounded overflow-auto max-h-96">
                    <table className="text-sm">
                      <thead>
                        <tr>
                          {type === 'produtos' && (
                            <>
                              <th>Código</th>
                              <th>Descrição</th>
                              <th>EAN</th>
                              <th>Unidade</th>
                            </>
                          )}
                          {type === 'caixaria' && (
                            <>
                              <th>Carga</th>
                              <th>Código</th>
                              <th>Descrição</th>
                              <th>Unidade</th>
                              <th>Qtd</th>
                            </>
                          )}
                          {type === 'multi' && (
                            <>
                              <th>Carga</th>
                              <th>Recipiente</th>
                              <th>Código</th>
                              <th>Descrição</th>
                              <th>Unidade</th>
                              <th>Qtd</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.preview.map((item, idx) => (
                          <tr key={idx}>
                            {type === 'produtos' && (
                              <>
                                <td>{item.codigo_produto}</td>
                                <td>{item.descricao}</td>
                                <td>{item.ean}</td>
                                <td>{item.tipo_unidade}</td>
                              </>
                            )}
                            {type === 'caixaria' && (
                              <>
                                <td>{item.identificador_carga}</td>
                                <td>{item.codigo_produto}</td>
                                <td>{item.descricao}</td>
                                <td>{item.unidade}</td>
                                <td>{item.quantidade}</td>
                              </>
                            )}
                            {type === 'multi' && (
                              <>
                                <td>{item.identificador_carga}</td>
                                <td>{item.recipiente}</td>
                                <td>{item.codigo_produto}</td>
                                <td>{item.descricao}</td>
                                <td>{item.unidade}</td>
                                <td>{item.quantidade}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn-outline" data-testid="btn-fechar">
              Fechar
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !file}
              className="btn-primary flex items-center gap-2"
              data-testid="btn-importar"
            >
              <Upload size={20} />
              {loading ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
