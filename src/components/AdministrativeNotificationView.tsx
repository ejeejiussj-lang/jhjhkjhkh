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

const buildDefaultText = (
  order: PurchaseOrder | null,
  prazoDias: string,
  orgao: string,
  fiscal: string,
  companyName: string,
  cnpj: string,
  orderNumber: string,
  deliveryDate: string
) => {
  const orderText = order?.orderNumber || orderNumber || '[número da ordem]';
  const companyText = order?.companyName || companyName || '[empresa notificada]';
  const cnpjText = order?.cnpj || cnpj || '[CNPJ]';
  const deliveryText = order?.expectedDeliveryDate ? formatBRDate(order.expectedDeliveryDate) : deliveryDate || '[data prevista]';
  const days = order ? getDaysUntil(order.expectedDeliveryDate) : null;
  const atraso = days !== null && days < 0 ? `${Math.abs(days)} dia(s)` : '[quantidade de dias]';

  return `Conforme registros desta Administração, foi emitida a Ordem de Compra nº ${orderText}, em favor da empresa ${companyText}, inscrita no CNPJ sob o nº ${cnpjText}, com entrega prevista para ${deliveryText}.

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

  const [selectedOrderId, setSelectedOrderId] = useState(initialOrder?.id || 'manual');
  const selectedOrder = selectedOrderId === 'manual' ? null : overdueOrders.find((order) => order.id === selectedOrderId) || null;
  const isManual = selectedOrderId === 'manual';

  const [manualCompanyName, setManualCompanyName] = useState('');
  const [manualCnpj, setManualCnpj] = useState('');
  const [manualOrderNumber, setManualOrderNumber] = useState('');
  const [manualDeliveryDate, setManualDeliveryDate] = useState('');
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
    if (!texto.trim() || initialOrder) {
      setTexto(buildDefaultText(selectedOrder, prazoDias, orgao, fiscal, manualCompanyName, manualCnpj, manualOrderNumber, manualDeliveryDate));
    }
  }, [selectedOrderId]);

  const orderNumber = selectedOrder?.orderNumber || manualOrderNumber;
  const companyName = selectedOrder?.companyName || manualCompanyName;
  const cnpj = selectedOrder?.cnpj || manualCnpj;
  const deliveryDate = selectedOrder?.expectedDeliveryDate ? formatBRDate(selectedOrder.expectedDeliveryDate) : manualDeliveryDate;
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const updatePendingItem = (id: string, field: keyof Omit<PendingItem, 'id'>, value: string) => {
    setPendingItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const addPendingItem = () => {
    setPendingItems((current) => [...current, createPendingItem()]);
  };

  const removePendingItem = (id: string) => {
    setPendingItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== id));
  };

  const selectManualNotification = () => {
    setSelectedOrderId('manual');
    setTexto(buildDefaultText(null, prazoDias, orgao, fiscal, manualCompanyName, manualCnpj, manualOrderNumber, manualDeliveryDate));
  };

  const resetText = () => {
    setTexto(buildDefaultText(selectedOrder, prazoDias, orgao, fiscal, manualCompanyName, manualCnpj, manualOrderNumber, manualDeliveryDate));
  };

  const renderEditableOrText = (value: string, setter: (value: string) => void, placeholder: string, className = 'w-[70%]') => {
    if (!isManual) return value || placeholder;
    return (
      <input
        value={value}
        onChange={(event) => setter(event.target.value)}
        placeholder={placeholder}
        className={`${className} border-0 border-b border-dashed border-slate-300 px-1 outline-none focus:border-slate-700`}
      />
    );
  };

  const handleGeneratePdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Notificação Administrativa - ${escapeHtml(orderNumber || 'manual')}</title>
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
    <header><img src="${notificationHeader}" alt="Prefeitura Municipal de Pereiro" /></header>
    <h1>Notificação Administrativa</h1>
    <section class="process">
      ${processo ? `<p>Pregão Eletrônico nº ${escapeHtml(processo)}</p>` : ''}
      ${contrato ? `<p>Contrato nº ${escapeHtml(contrato)}</p>` : ''}
    </section>
    <section class="meta">
      <p><strong>Notificante:</strong> ${escapeHtml(orgao || '[órgão notificante]')}</p>
      <p><strong>Notificado:</strong> ${escapeHtml(companyName || '[empresa notificada]')}${cnpj ? `, CNPJ nº ${escapeHtml(cnpj)}` : ''}</p>
      ${representante ? `<p><strong>Representante:</strong> ${escapeHtml(representante)}</p>` : ''}
      ${endereco ? `<p><strong>Endereço:</strong> ${escapeHtml(endereco)}</p>` : ''}
      ${orderNumber ? `<p><strong>Ordem de Compra:</strong> ${escapeHtml(orderNumber)}</p>` : ''}
      ${deliveryDate ? `<p><strong>Entrega prevista:</strong> ${escapeHtml(deliveryDate)}</p>` : ''}
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
          <p className="text-xs text-slate-500 mt-1">Use uma ordem atrasada ou crie uma notificação manual.</p>
        </div>
        <button
          onClick={handleGeneratePdf}
          disabled={!texto.trim()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Gerar PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[320px_1fr] gap-5 items-start">
        <aside className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-800">Notificações</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Comece manualmente ou selecione uma ordem atrasada.</p>
            </div>
            <button
              onClick={selectManualNotification}
              className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${isManual ? 'bg-emerald-600 text-white border-emerald-600' : 'text-emerald-700 border-emerald-100 hover:bg-emerald-50'}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar notificação manual</span>
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
            {overdueOrders.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <AlertTriangle className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Nenhuma ordem atrasada.</p>
                <p className="text-[11px] text-slate-500 mt-1">A criação manual continua disponível.</p>
              </div>
            ) : overdueOrders.map((order) => (
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
        </aside>

        <section className="bg-slate-200/70 border border-slate-300 rounded-2xl p-3 sm:p-6 overflow-x-auto">
          <div className="mx-auto bg-white text-black shadow-lg border border-slate-300 w-full max-w-[860px] min-h-[1120px] px-8 sm:px-14 py-10 font-serif text-[15px] leading-[1.35]">
            <div className="text-center mb-4">
              <img src={notificationHeader} alt="Prefeitura Municipal de Pereiro" className="w-72 mx-auto object-contain" />
            </div>
            <h2 className="text-center uppercase font-bold text-sm mb-7">Notificação Administrativa</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5 font-bold uppercase text-[13px]">
              <input value={processo} onChange={(e) => setProcesso(e.target.value)} placeholder="Pregão Eletrônico nº" className="border-0 border-b border-dashed border-slate-300 px-1 py-1 outline-none focus:border-slate-700" />
              <input value={contrato} onChange={(e) => setContrato(e.target.value)} placeholder="Contrato nº" className="border-0 border-b border-dashed border-slate-300 px-1 py-1 outline-none focus:border-slate-700" />
            </div>

            <div className="space-y-2 mb-5 text-[14px]">
              <p><strong>NOTIFICANTE:</strong> <input value={orgao} onChange={(e) => setOrgao(e.target.value)} className="w-[70%] border-0 border-b border-dashed border-slate-300 px-1 outline-none focus:border-slate-700" /></p>
              <p><strong>NOTIFICADO:</strong> {renderEditableOrText(companyName, setManualCompanyName, 'Empresa notificada')}</p>
              <p><strong>CNPJ:</strong> {renderEditableOrText(cnpj, setManualCnpj, '00.000.000/0001-00', 'w-[42%]')}</p>
              <p><strong>REPRESENTANTE:</strong> <input value={representante} onChange={(e) => setRepresentante(e.target.value)} className="w-[70%] border-0 border-b border-dashed border-slate-300 px-1 outline-none focus:border-slate-700" /></p>
              <p><strong>ENDEREÇO:</strong> <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-[78%] border-0 border-b border-dashed border-slate-300 px-1 outline-none focus:border-slate-700" /></p>
              <p><strong>ORDEM DE COMPRA:</strong> {renderEditableOrText(orderNumber, setManualOrderNumber, 'número da ordem', 'w-[32%]')} <span className="ml-3"><strong>ENTREGA:</strong> {renderEditableOrText(deliveryDate, setManualDeliveryDate, 'data prevista', 'w-[28%]')}</span></p>
              <p><strong>E-MAIL DE ENVIO:</strong> <input value={emailEnvio} onChange={(e) => setEmailEnvio(e.target.value)} className="w-[62%] border-0 border-b border-dashed border-slate-300 px-1 outline-none focus:border-slate-700" /></p>
            </div>

            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full min-h-[290px] resize-y border border-dashed border-slate-300 bg-white p-3 text-justify font-serif text-[15px] leading-[1.45] outline-none focus:border-slate-700 whitespace-pre-wrap"
            />

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="uppercase font-bold text-[13px]">Itens pendentes de entrega</h3>
                <div className="flex items-center gap-2 print:hidden">
                  <button onClick={resetText} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer">
                    <RefreshCw className="w-3 h-3" />
                    <span>Repreencher</span>
                  </button>
                  <button onClick={addPendingItem} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-100 cursor-pointer">
                    <Plus className="w-3 h-3" />
                    <span>Adicionar item</span>
                  </button>
                </div>
              </div>
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-700 px-2 py-1 w-20 text-center">Item</th>
                    <th className="border border-slate-700 px-2 py-1 text-left">Descrição</th>
                    <th className="border border-slate-700 px-2 py-1 w-24 text-center">Unidade</th>
                    <th className="border border-slate-700 px-2 py-1 w-28 text-center">Quantidade</th>
                    <th className="border border-slate-700 px-2 py-1 w-14 text-center print:hidden">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-slate-700 p-1"><input value={item.item} onChange={(e) => updatePendingItem(item.id, 'item', e.target.value)} placeholder={String(index + 1)} className="w-full text-center outline-none" /></td>
                      <td className="border border-slate-700 p-1"><input value={item.description} onChange={(e) => updatePendingItem(item.id, 'description', e.target.value)} className="w-full outline-none" /></td>
                      <td className="border border-slate-700 p-1"><input value={item.unit} onChange={(e) => updatePendingItem(item.id, 'unit', e.target.value)} className="w-full text-center outline-none" /></td>
                      <td className="border border-slate-700 p-1"><input value={item.quantity} onChange={(e) => updatePendingItem(item.id, 'quantity', e.target.value)} className="w-full text-center outline-none" /></td>
                      <td className="border border-slate-700 p-1 text-center print:hidden">
                        <button onClick={() => removePendingItem(item.id)} disabled={pendingItems.length === 1} className="p-1 text-slate-500 hover:text-rose-600 disabled:opacity-40 cursor-pointer" title="Remover item">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-right mt-8">Pereiro/CE, em {today}.</p>
            <div className="text-center font-bold mt-8 leading-snug">
              <input value={fiscal} onChange={(e) => setFiscal(e.target.value)} className="text-center font-bold border-0 border-b border-dashed border-slate-300 px-2 py-1 outline-none focus:border-slate-700" />
              <p>Fiscal de contrato</p>
              <p>Portaria nº: <input value={portaria} onChange={(e) => setPortaria(e.target.value)} className="text-center font-bold border-0 border-b border-dashed border-slate-300 px-1 py-1 outline-none focus:border-slate-700" /></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};