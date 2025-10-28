import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { ArrowLeft, Plus, Edit2, Trash2, Search, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProdutosScreen({ onVoltar }) {
  const [produtos, setProdutos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({ descricao: '', codigo_produto: '', ean: '' });
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('criar');
  const [produtoEdit, setProdutoEdit] = useState(null);
  const [formData, setFormData] = useState({
    codigo_produto: '',
    descricao: '',
    ean: '',
    tipo_unidade: 'UNI',
    ativo: true
  });
  const [confirmDelete, setConfirmDelete] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState(null);

  useEffect(() => {
    carregarProdutos();
  }, [page, filtros]);

  const carregarProdutos = async () => {
    try {
      const params = { page, limit: 50 };
      if (filtros.descricao) params.descricao = filtros.descricao;
      if (filtros.codigo_produto) params.codigo_produto = filtros.codigo_produto;
      if (filtros.ean) params.ean = filtros.ean;

      const [produtosRes, countRes] = await Promise.all([
        axios.get(`${API}/produtos`, { params }),
        axios.get(`${API}/produtos/count`, { params })
      ]);

      setProdutos(produtosRes.data);
      setTotal(countRes.data.total);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    }
  };

  const handleBuscar = () => {
    setPage(1);
    carregarProdutos();
  };

  const handleLimparFiltros = () => {
    setFiltros({ descricao: '', codigo_produto: '', ean: '' });
    setPage(1);
  };

  const handleOpenModal = (mode, produto = null) => {
    setModalMode(mode);
    if (mode === 'editar' && produto) {
      setProdutoEdit(produto);
      setFormData({
        codigo_produto: produto.codigo_produto,
        descricao: produto.descricao,
        ean: produto.ean,
        tipo_unidade: produto.tipo_unidade,
        ativo: produto.ativo
      });
    } else {
      setProdutoEdit(null);
      setFormData({
        codigo_produto: '',
        descricao: '',
        ean: '',
        tipo_unidade: 'UNI',
        ativo: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === 'criar') {
        await axios.post(`${API}/produtos/criar`, formData);
        toast.success('Produto criado com sucesso!');
      } else {
        await axios.put(`${API}/produtos/${produtoEdit.id}`, formData);
        toast.success('Produto atualizado com sucesso!');
      }
      setShowModal(false);
      carregarProdutos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar produto');
    }
  };

  const handleOpenDeleteModal = (produto) => {
    setProdutoToDelete(produto);
    setConfirmDelete('');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (confirmDelete !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar');
      return;
    }

    try {
      await axios.delete(`${API}/produtos/${produtoToDelete.id}`);
      toast.success('Produto excluído com sucesso!');
      setShowDeleteModal(false);
      setProdutoToDelete(null);
      carregarProdutos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir produto');
    }
  };

  const handleDesativar = async (produto) => {
    try {
      await axios.put(`${API}/produtos/${produto.id}`, { ativo: false });
      toast.success('Produto desativado com sucesso!');
      carregarProdutos();
    } catch (error) {
      toast.error('Erro ao desativar produto');
    }
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-4 border-black p-6">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={onVoltar} className="btn-outline p-2" data-testid="btn-voltar-produtos">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
              Gerenciar Produtos
            </h1>
            <p className="text-sm mt-1">CRUD de produtos cadastrados</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <section className="border-2 border-black p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Search size={20} />
              Filtros e Busca
            </h2>
            <button
              onClick={() => handleOpenModal('criar')}
              className="btn-primary flex items-center gap-2"
              data-testid="btn-novo-produto"
            >
              <Plus size={20} />
              Novo Produto
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Buscar por descrição"
              value={filtros.descricao}
              onChange={(e) => setFiltros({ ...filtros, descricao: e.target.value })}
              data-testid="filtro-descricao"
            />
            <input
              type="text"
              placeholder="Código do produto"
              value={filtros.codigo_produto}
              onChange={(e) => setFiltros({ ...filtros, codigo_produto: e.target.value })}
              data-testid="filtro-codigo"
            />
            <input
              type="text"
              placeholder="EAN"
              value={filtros.ean}
              onChange={(e) => setFiltros({ ...filtros, ean: e.target.value })}
              data-testid="filtro-ean"
            />
            <div className="flex gap-2">
              <button onClick={handleBuscar} className="btn-primary flex-1" data-testid="btn-buscar">
                Buscar
              </button>
              <button onClick={handleLimparFiltros} className="btn-outline" data-testid="btn-limpar">
                Limpar
              </button>
            </div>
          </div>
        </section>

        <section className="border-2 border-black rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table data-testid="produtos-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>EAN</th>
                  <th>Unidade</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                ) : (
                  produtos.map((produto) => (
                    <tr key={produto.id} data-testid={`produto-${produto.codigo_produto}`}>
                      <td className="font-mono font-semibold">{produto.codigo_produto}</td>
                      <td>{produto.descricao}</td>
                      <td className="font-mono">{produto.ean}</td>
                      <td className="text-center">
                        <span className="px-2 py-1 bg-gray-200 rounded text-xs font-semibold">
                          {produto.tipo_unidade}
                        </span>
                      </td>
                      <td>
                        <span className={`px-3 py-1 rounded text-sm font-semibold ${
                          produto.ativo ? 'status-ok' : 'bg-gray-400 text-white'
                        }`}>
                          {produto.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal('editar', produto)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            data-testid={`btn-editar-${produto.codigo_produto}`}
                          >
                            <Edit2 size={18} />
                          </button>
                          {produto.ativo ? (
                            <button
                              onClick={() => handleOpenDeleteModal(produto)}
                              className="text-red-600 hover:text-red-800 p-1"
                              data-testid={`btn-excluir-${produto.codigo_produto}`}
                            >
                              <Trash2 size={18} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="border-t-2 border-black p-4 flex items-center justify-between">
              <p className="text-sm">
                Página {page} de {totalPages} • Total: {total} produtos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {modalMode === 'criar' ? 'Novo Produto' : 'Editar Produto'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Código do Produto *</label>
                <input
                  type="text"
                  value={formData.codigo_produto}
                  onChange={(e) => setFormData({ ...formData, codigo_produto: e.target.value })}
                  required
                  data-testid="input-codigo"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Descrição *</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  required
                  data-testid="input-descricao"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">EAN *</label>
                <input
                  type="text"
                  value={formData.ean}
                  onChange={(e) => setFormData({ ...formData, ean: e.target.value })}
                  required
                  data-testid="input-ean-form"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Tipo de Unidade *</label>
                <select
                  value={formData.tipo_unidade}
                  onChange={(e) => setFormData({ ...formData, tipo_unidade: e.target.value })}
                  data-testid="select-tipo-unidade"
                >
                  <option value="UNI">UNI - Unidade</option>
                  <option value="CX">CX - Caixa</option>
                  <option value="EXB">EXB - Exibição</option>
                </select>
              </div>

              {modalMode === 'editar' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    data-testid="checkbox-ativo"
                    className="w-5 h-5"
                  />
                  <label className="font-semibold">Produto Ativo</label>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" data-testid="btn-salvar-produto">
                  {modalMode === 'criar' ? 'Criar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && produtoToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="flex items-start gap-3 mb-6">
              <AlertTriangle size={32} className="text-red-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-2">Confirmar Exclusão</h2>
                <p className="text-sm mb-4">
                  Você está prestes a excluir o produto:
                  <br />
                  <strong>{produtoToDelete.codigo_produto} - {produtoToDelete.descricao}</strong>
                </p>
                <p className="text-sm text-red-600 font-semibold mb-4">
                  Esta ação não pode ser desfeita!
                </p>
                <label className="block text-sm font-bold mb-2">
                  Digite <span className="text-red-600">EXCLUIR</span> para confirmar:
                </label>
                <input
                  type="text"
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                  placeholder="Digite EXCLUIR"
                  className="w-full mb-4"
                  data-testid="input-confirmar-exclusao"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="btn-outline">
                Cancelar
              </button>
              <button
                onClick={() => handleDesativar(produtoToDelete)}
                className="btn-secondary"
                data-testid="btn-desativar"
              >
                Apenas Desativar
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:opacity-90"
                disabled={confirmDelete !== 'EXCLUIR'}
                data-testid="btn-confirmar-exclusao"
              >
                Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
