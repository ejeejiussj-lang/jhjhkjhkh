import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, Plus, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { formatBRDate, parseBRDate } from '../utils/dateFormat';
import notificationHeader from '../../assets/templates/notification-image1.png';

interface AdministrativeNotificationViewProps {
  purchaseOrders: PurchaseOrder[];
  initialOrder?: PurchaseOrder | null;
  onInitialOrderHandled?: () => void;
}

interface PendingItem {
  id: string;
  item: string;
  description: string;
  unit: string;
  quantity: string;
}

const createPendingItem = (): PendingItem => ({
  id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  item: '',
  description: '',
  unit: '',
  quantity: ''
});

const getDaysUntil = (dateText: string) => {
  const target = parseBRDate(dateText);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const paragraphHtml = (value: string) =>
  escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('');

const buildDefaultText = (order: PurchaseOrder | null, prazoDias: string, orgao: string, fiscal: string) => {
  const orderNumber = order?.orderNumber || '[número da ordem]';
  const companyName = order?.companyName || '[empresa notificada]';
  const cnpj = order?.cnpj || '[CNPJ]';
  const deliveryDate = order?.expectedDeliveryDate ? formatBRDate(order.expectedDeliveryDate) : '[data prevista]';
  const days = order ? getDaysUntil(order.expectedDeliveryDate) : null;
  const atraso = days !== null && days < 0 ? `${Math.abs(days)} dia(s)` : '[quantidade de dias]';

  return `Conforme registros desta Administração, foi emitida a Ordem de Compra nº ${orderNumber}, em favor da empresa ${companyName}, inscrita no CNPJ sob o nº ${cnpj}, com entrega prevista para ${deliveryDate}.

Verifica-se que, até a presente data, não houve a entrega do objeto correspondente, caracterizando atraso de ${atraso} em relação ao prazo previsto.

Diante disso, ${orgao || '[órgão notificante]'}, por intermédio de seu fiscal responsável${fiscal ? `, ${fiscal}` : ''}, NOTIFICA a empresa para que regularize a entrega dos itens constantes na ordem de compra no prazo de ${prazoDias || '[prazo]'} dia(s), contado do recebimento desta notificação.

O não atendimento à presente notificação poderá ensejar a adoção das medidas administrativas cabíveis, inclusive apuração de responsabilidade, aplicação de penalidades contratuais e demais providências previstas na legislação aplicável.`;
};

const buildItemsTable = (items: PendingItem[]) => {
  const filledItems = items.filter((item) => item.item.trim() || item.description.trim() || item.unit.trim() || item.quantity.trim());
  if (filledItems.length === 0) return '';

  const rows = filledItems.map((item, index) => `
    <tr>
      <td>${escapeHtml(item.item || String(index + 1))}</td>
      <td>${escapeHtml(item.description)}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(item.quantity)}</td>
    </tr>`).join('');

  return `<section>
    <h2>Itens pendentes de entrega</h2>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Descrição</th>
          <th>Unidade</th>
          <th>Quantidade</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
};

export const AdministrativeNotificationView: React.FC<AdministrativeNotificationViewProps> = ({
  purchaseOrders,
  initialOrder,
  onInitialOrderHandled
}) => {
  const overdueOrders = useMemo(
    () => purchaseOrders
      .map((order) => ({ ...order, daysRemaining: getDaysUntil(order.expectedDeliveryDate) }))
      .filter((order) => order.status === 'Pendente' && order.daysRemaining !== null && order.daysRemaining < 0)
      .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0)),
    [purchaseOrders]
  );

  const [selectedOrderId, setSelectedOrderId] = useState(initialOrder?.id || overdueOrders[0]?.id || '');
  const selectedOrder = overdueOrders.find((order) => order.id === selectedOrderId) || null;

  const [processo, setProcesso] = useState('');
  const [contrato, setContrato] = useState('');
  const [orgao, setOrgao] = useState('Secretaria de Saúde e Saneamento');
  const [fiscal, setFiscal] = useState('Francisco Álamo Carlos Rocha');
  const [portaria, setPortaria] = useState('2026.2.06.1-SRH fiscal');
  const [representante, setRepresentante] = useState('');
  const [endereco, setEndereco] = useState('');
  const [emailEnvio, setEmailEnvio] = useState('compraspereiro@gmail.com');
  const [prazoDias, setPrazoDias] = useState('10');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([createPendingItem()]);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (initialOrder) {
      setSelectedOrderId(initialOrder.id);
      onInitialOrderHandled?.();
    }
  }, [initialOrder, onInitialOrderHandled]);

  useEffect(() => {
    if (!selectedOrderId && overdueOrders[0]) {
      setSelectedOrderId(overdueOrders[0].id);
    }
  }, [overdueOrders, selectedOrderId]);

  useEffect(() => {
    setTexto(buildDefaultText(selectedOrder, prazoDias, orgao, fiscal));
  }, [selectedOrderId]);

  const updatePendingItem = (id: string, field: keyof Omit<PendingItem, 'id'>, value: string) => {
    setPendingItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const addPendingItem = () => {
    setPendingItems((current) => [...current, createPendingItem()]);
  };

  const removePendingItem = (id: string) => {
    setPendingItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== id));
  };

  const resetText = () => {
    setTexto(buildDefaultText(selectedOrder, prazoDias, orgao, fiscal));
  };

  const handleGeneratePdf = () => {
    const orderNumber = selectedOrder?.orderNumber || '[número da ordem]';
    const companyName = selectedOrder?.companyName || '[empresa notificada]';
    const cnpj = selectedOrder?.cnpj || '[CNPJ]';
    const deliveryDate = selectedOrder?.expectedDeliveryDate ? formatBRDate(selectedOrder.expectedDeliveryDate) : '[data prevista]';
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Notificação Administrativa - ${escapeHtml(orderNumber)}</title>
  <style>
    @page { size: A4; margin: 14mm 18mm 16mm; }
    * { box-sizing: border-box; }
    body { color: #111; font-family: 'Times New Roman', Times, serif; font-size: 10.8pt; line-height: 1.28; margin: 0; }
    .page { max-width: 174mm; margin: 0 auto; }
    header { text-align: center; margin: 0 0 10px; }
    header img { width: 82mm; max-width: 100%; height: auto; object-fit: contain; }
    h1 { font-size: 10.5pt; margin: 4px 0 20px; text-align: center; text-transform: uppercase; font-weight: 700; }
    h2 { font-size: 10pt; margin: 14px 0 6px; text-transform: uppercase; font-weight: 700; }
    p { margin: 0 0 9px; text-align: justify; }
    .process { margin: 0 0 14px; font-weight: 700; text-transform: uppercase; }
    .process p { margin: 0 0 2px; text-align: left; }
    .meta { margin: 0 0 15px; }
    .meta p { margin: 0 0 6px; text-align: left; }
    .meta strong { text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 9.8pt; }
    th, td { border: 1px solid #222; padding: 5px 6px; vertical-align: top; }
    th { background: #f4f4f4; text-align: left; text-transform: uppercase; font-size: 9pt; }
    th:nth-child(1), td:nth-child(1) { width: 14%; text-align: center; }
    th:nth-child(3), td:nth-child(3) { width: 17%; text-align: center; }
    th:nth-child(4), td:nth-child(4) { width: 17%; text-align: center; }
    .date { margin-top: 22px; text-align: right; }
    .signature { margin-top: 26px; text-align: center; font-weight: 700; }
    .signature p { text-align: center; margin: 0 0 3px; }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <img src="${notificationHeader}" alt="Prefeitura Municipal de Pereiro" />
    </header>
    <h1>Notificação Administrativa</h1>
    <section class="process">
      ${processo ? `<p>Pregão Eletrônico nº ${escapeHtml(processo)}</p>` : ''}
      ${contrato ? `<p>Contrato nº ${escapeHtml(contrato)}</p>` : ''}
    </section>
    <section class="meta">
      <p><strong>Notificante:</strong> ${escapeHtml(orgao || '[órgão notificante]')}</p>
      <p><strong>Notificado:</strong> ${escapeHtml(companyName)}, CNPJ nº ${escapeHtml(cnpj)}</p>
      ${representante ? `<p><strong>Representante:</strong> ${escapeHtml(representante)}</p>` : ''}
      ${endereco ? `<p><strong>Endereço:</strong> ${escapeHtml(endereco)}</p>` : ''}
      <p><strong>Ordem de Compra:</strong> ${escapeHtml(orderNumber)}</p>
      <p><strong>Entrega prevista:</strong> ${escapeHtml(deliveryDate)}</p>
      ${emailEnvio ? `<p><strong>E-mail de envio:</strong> ${escapeHtml(emailEnvio)}</p>` : ''}
    </section>
    <section>${paragraphHtml(texto)}</section>
    ${buildItemsTable(pendingItems)}
    <p class="date">Pereiro/CE, em ${escapeHtml(today)}.</p>
    <div class="signature">
      <p>${escapeHtml(fiscal || '[responsável pela notificação]')}</p>
      <p>Fiscal de contrato</p>
      ${portaria ? `<p>Portaria nº: ${escapeHtml(portaria)}</p>` : ''}
    </div>
  </main>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-600" />
            <span>Notificação Administrativa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Editor para notificar fornecedores com ordens de compra atrasadas.</p>
        </div>
        <button
          onClick={handleGeneratePdf}
          disabled={!selectedOrder}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Gerar PDF</span>
        </button>
      </div>

      {overdueOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-2xs">
          <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">Nenhuma ordem de compra atrasada.</p>
          <p className="text-xs text-slate-500 mt-1">A notificação fica disponível quando uma ordem pendente passa da data prevista de entrega.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
              <p className="text-xs font-semibold text-slate-800">Ordens atrasadas</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Selecione uma ordem para preencher o documento.</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
              {overdueOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${selectedOrderId === order.id ? 'bg-rose-50' : 'hover:bg-slate-50'}`}
                >
                  <p className="text-xs font-semibold text-slate-900 truncate" title={order.companyName}>{order.companyName}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">{order.orderNumber}</p>
                  <p className="text-[11px] text-rose-700 mt-1">Atrasada há {Math.abs(order.daysRemaining ?? 0)} dia(s)</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-700">Processo / Pregão</span>
                <input value={processo} onChange={(e) => setProcesso(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-700">Contrato</span>
                <input value={contrato} onChange={(e) => setContrato(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-700">Órgão notificante</span>
                <input value={orgao} onChange={(e) => setOrgao(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-700">Fiscal / responsável</span>
                <input value={fiscal} onChange={(e) => setFiscal(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-700">Portaria</span>
                <input value={portaria} onChange={(e) => setPortaria(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-700">Prazo para regularização</span>
                <input type="number" min="1" value={prazoDias} onChange={(e) => setPrazoDias(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-700">Representante da empresa</span>
                <input value={representante} onChange={(e) => setRepresentante(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-700">E-mail de envio</span>
                <input value={emailEnvio} onChange={(e) => setEmailEnvio(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium text-slate-700">Endereço da empresa</span>
                <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-medium text-slate-700">Itens pendentes</span>
                <button onClick={addPendingItem} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-100 rounded-lg transition-colors cursor-pointer self-start sm:self-auto">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar item</span>
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[720px] text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold w-28">Item</th>
                      <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                      <th className="px-3 py-2 text-left font-semibold w-32">Unidade</th>
                      <th className="px-3 py-2 text-left font-semibold w-32">Quantidade</th>
                      <th className="px-3 py-2 text-right font-semibold w-16">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-2 py-2">
                          <input value={item.item} onChange={(e) => updatePendingItem(item.id, 'item', e.target.value)} placeholder={String(index + 1)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </td>
                        <td className="px-2 py-2">
                          <input value={item.description} onChange={(e) => updatePendingItem(item.id, 'description', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </td>
                        <td className="px-2 py-2">
                          <input value={item.unit} onChange={(e) => updatePendingItem(item.id, 'unit', e.target.value)} placeholder="unid." className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </td>
                        <td className="px-2 py-2">
                          <input value={item.quantity} onChange={(e) => updatePendingItem(item.id, 'quantity', e.target.value)} placeholder="0" className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => removePendingItem(item.id)} disabled={pendingItems.length === 1} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer" title="Remover item">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-700">Texto da notificação</span>
                <button onClick={resetText} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Repreencher</span>
                </button>
              </div>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={14}
                className="w-full px-4 py-3 text-sm leading-6 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};