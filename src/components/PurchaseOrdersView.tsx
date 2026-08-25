import React, { useMemo, useState } from 'react';
import { Calendar, Check, Edit3, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { brDateToInputDate, formatBRDate, inputDateToBRDate, parseBRDate } from '../utils/dateFormat';

interface PurchaseOrdersViewProps {
  purchaseOrders: PurchaseOrder[];
  onAddPurchaseOrder: (order: PurchaseOrder) => void;
  onUpdatePurchaseOrder: (order: PurchaseOrder) => void;
  onDeletePurchaseOrder: (id: string) => void;
}

const getDaysUntil = (dateText: string) => {
  const target = parseBRDate(dateText);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  purchaseOrders,
  onAddPurchaseOrder,
  onUpdatePurchaseOrder,
  onDeletePurchaseOrder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [status, setStatus] = useState<PurchaseOrder['status']>('Pendente');

  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return purchaseOrders;
    return purchaseOrders.filter((order) =>
      order.orderNumber.toLowerCase().includes(term) ||
      order.companyName.toLowerCase().includes(term) ||
      order.cnpj.toLowerCase().includes(term) ||
      order.status.toLowerCase().includes(term)
    );
  }, [purchaseOrders, searchTerm]);

  const openNewModal = () => {
    setEditingOrder(null);
    setOrderNumber('');
    setCompanyName('');
    setCnpj('');
    setExpectedDeliveryDate('');
    setStatus('Pendente');
    setIsModalOpen(true);
  };

  const openEditModal = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setOrderNumber(order.orderNumber);
    setCompanyName(order.companyName);
    setCnpj(order.cnpj);
    setExpectedDeliveryDate(order.expectedDeliveryDate);
    setStatus(order.status);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingOrder(null);
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !companyName.trim() || !cnpj.trim() || !expectedDeliveryDate) return;

    const payload: PurchaseOrder = {
      id: editingOrder?.id || 'oc-' + Date.now(),
      orderNumber: orderNumber.trim(),
      companyName: companyName.trim(),
      cnpj: cnpj.trim(),
      expectedDeliveryDate,
      status,
      createdAt: editingOrder?.createdAt || new Date().toISOString()
    };

    if (editingOrder) {
      onUpdatePurchaseOrder(payload);
    } else {
      onAddPurchaseOrder(payload);
    }

    closeModal();
  };

  const getDeliveryBadge = (order: PurchaseOrder) => {
    if (order.status === 'Entregue' || order.status === 'Cancelada') {
      return 'bg-slate-100 text-slate-600 border-slate-200';
    }

    const days = getDaysUntil(order.expectedDeliveryDate);
    if (days !== null && days < 0) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (days !== null && days <= 7) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const getDeliveryText = (order: PurchaseOrder) => {
    const days = getDaysUntil(order.expectedDeliveryDate);
    if (order.status === 'Entregue') return 'Entregue';
    if (order.status === 'Cancelada') return 'Cancelada';
    if (days === null) return 'Data invalida';
    if (days < 0) return 'Atrasada';
    if (days === 0) return 'Entrega hoje';
    if (days <= 7) return 'Vence em ' + days + 'd';
    return 'No prazo';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight flex items-center space-x-2.5">
            <ShoppingCart className="w-7 h-7 text-emerald-600" />
            <span>Ordens de Compras</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro e acompanhamento dos prazos previstos de entrega.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Lancar Ordem</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ordem, razao social ou CNPJ..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>
        <span className="text-xs font-medium text-slate-500">
          Total: <span className="font-medium text-slate-900">{filteredOrders.length}</span> ordem(ns)
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-medium uppercase text-slate-600 tracking-wider">
                <th className="py-3.5 px-4">Ordem</th>
                <th className="py-3.5 px-4">Razao Social</th>
                <th className="py-3.5 px-4">CNPJ</th>
                <th className="py-3.5 px-4">Data Prevista da Entrega</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700 text-xs">Nenhuma ordem de compras cadastrada.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 font-mono">{order.orderNumber}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{order.companyName}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{order.cnpj}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="inline-flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatBRDate(order.expectedDeliveryDate)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ' + getDeliveryBadge(order)}>
                        {getDeliveryText(order)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(order)}
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar ordem"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeletePurchaseOrder(order.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir ordem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div>
                <h3 className="text-base font-medium text-slate-900">
                  {editingOrder ? 'Editar Ordem de Compras' : 'Lancar Ordem de Compras'}
                </h3>
                <p className="text-[11px] text-slate-500">Informe fornecedor e prazo previsto de entrega</p>
              </div>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome / Numero da Ordem <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Ex: OC-2026-001"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Razao Social <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Digite a razao social"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">CNPJ <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Data Prevista da Entrega <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={brDateToInputDate(expectedDeliveryDate)}
                    onChange={(e) => setExpectedDeliveryDate(inputDateToBRDate(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PurchaseOrder['status'])}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-900 cursor-pointer"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Entregue">Entregue</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer">
                  <Check className="w-4 h-4" />
                  <span>{editingOrder ? 'Atualizar Ordem' : 'Salvar Ordem'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
