import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileText, Plus, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { GeneratedAdministrativeNotification, PurchaseOrder } from '../types';
import { formatBRDate, parseBRDate } from '../utils/dateFormat';
import notificationHeader from '../../assets/templates/notification-image3.png';

interface AdministrativeNotificationViewProps {
  purchaseOrders: PurchaseOrder[];
  initialOrder?: PurchaseOrder | null;
  onInitialOrderHandled?: () => void;
  onRegisterGeneratedNotification?: (notification: GeneratedAdministrativeNotification) => void;
}

interface PendingItem {
  id: string;
  item: string;
  description: string;
  unit: string;
  quantity: string;
}

interface DefaultTexts {
  beforeItems: string;
  afterItems: string;
}

interface AutoGrowTextareaProps {
  value: string;
  onChange: (value: string) => void;
  minHeight: number;
  className?: string;
}

const AutoGrowTextarea: React.FC<AutoGrowTextareaProps> = ({ value, onChange, minHeight, className = '' }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(minHeight, element.scrollHeight)}px`;
  }, [value, minHeight]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{ minHeight }}
      className={`w-full resize-none overflow-hidden border border-dashed border-slate-300 bg-white p-3 text-justify text-[15px] leading-[1.45] outline-none focus:border-slate-700 whitespace-pre-wrap ${className}`}
    />
  );
};

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

const formatDate = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + days);
  return result;
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

const buildDefaultTexts = (
  order: PurchaseOrder | null,
  prazoDias: string,
  orgao: string,
  companyName: string,
  cnpj: string,
  orderNumber: string,
  representante: string
): DefaultTexts => {
  const orderText = order?.orderNumber || orderNumber || '[ordem de compra]';
  const companyText = order?.companyName || companyName || '[empresa notificada]';
  const cnpjText = order?.cnpj || cnpj || '[CNPJ]';
  const representativeText = representante || '[representante]';
  const prazoText = prazoDias || '[prazo]';

  return {
    beforeItems: `Sr. ${representativeText},

Conforme é de conhecimento de Vossa Senhoria, foram enviadas as respectivas ordens de compra nº ${orderText}, referente ao contrato indicado, cujo objeto é o REGISTRO DE PREÇOS PARA A AQUISIÇÃO DE EQUIPAMENTOS E MATERIAIS PERMANENTES, destinados ao atendimento das necessidades do Município de Pereiro/CE, perante ${orgao || '[órgão notificante]'}.

As referidas ordens de compra foram enviadas pelo e-mail oficial e, em que pese as reiteradas tentativas de contato, a empresa acusou o recebimento e, até o presente momento, não houve a entrega dos seguintes itens:`,
    afterItems: `bem como sequer apresentou previsão de entrega, numa tentativa de solucionar o problema de forma mais célere e econômica para as partes.

Nessa esteira, tal conduta causa sério prejuízo ao município e fere as normas do contrato celebrado entre a secretaria notificante e a empresa notificada, o qual dispõe de cláusulas expressas sobre as obrigações para cumprimento do objeto e as consequências/penalidades advindas do atraso na entrega, incluindo a possibilidade de rescisão unilateral pelo Ente Público. Vejamos:

CLÁUSULA QUARTA - DAS OBRIGAÇÕES DA CONTRATANTE:

(...)

4.2.3. Exigir o cumprimento de todas as obrigações assumidas pelo Contratado, de acordo com o contrato e seus anexos;

4.2.4. Receber o objeto no prazo e condições estabelecidas no Termo de Referência.

CLÁUSULA QUINTA - DAS OBRIGAÇÕES DA CONTRATADA:

5.1. Entregar materiais para o qual tenha sido considerada vencedora no Almoxarifado Central do Município de Pereiro, no prazo máximo de 10 (dez) dias corridos, sem que isso implique em acréscimos nos preços constantes da proposta, o qual será conferido e, se achado irregular, devolvido à empresa, que terá o prazo de 24 (vinte e quatro) horas para efetuar a substituição;

(...)

5.10. O Contratado deve cumprir todas as obrigações constantes deste Contrato e em seus anexos, assumindo como exclusivamente seus os riscos e as despesas decorrentes da boa e perfeita execução do objeto.

(...)

5.12. Comunicar ao contratante, no prazo máximo de 24 (vinte e quatro) horas que antecede a data da entrega, os motivos que impossibilitem o cumprimento do prazo previsto, com a devida comprovação.

TERMO DE REFERÊNCIA

(...)

7.1. Os materiais deverão ser entregues no almoxarifado da Prefeitura Municipal de Pereiro, em dia de expediente normal, no horário de 07:00 às 11:00 e das 13:00 às 17:00 horas.

7.1.1. Os materiais deverão ser entregues adequadamente, de forma a permitir completa segurança durante o transporte no prazo máximo de 10 (dez) dias, contados da data de entrega do empenho ou ordem de fornecimento ao fornecedor, através de Nota Fiscal/Fatura, sem qualquer acréscimo adicional.

Dessa feita, atentando-se às cláusulas do contrato acima expostas, ao termo de referência e aos dispositivos legais aplicáveis ao caso, especialmente a Lei Federal nº 14.133/2021, a Lei Complementar nº 147/2014 e o Decreto Municipal nº 310/2023, ${orgao || '[órgão notificante]'} vem, pela presente, NOTIFICAR A EMPRESA ${companyText}, inscrita no CNPJ sob o nº ${cnpjText}, para que entregue, no prazo de ${prazoText} dia(s), os itens conforme ordem de compra encaminhada, como é de seu dever contratual, sob pena de resolução contratual por descumprimento pela contratada.

Reitera-se que a referida entrega deve ser realizada com urgência, considerando tratar-se de materiais indispensáveis ao adequado funcionamento dos serviços públicos prestados pelo Município. A ausência desses itens compromete a estrutura e o atendimento, prejudicando a realização de procedimentos, atividades e demais serviços essenciais oferecidos à população. Diante disso, impõe-se prioridade absoluta ao cumprimento da obrigação contratual, sob pena de agravamento dos prejuízos à continuidade, à eficiência e à qualidade dos serviços.

Obs.: A não acusação de recebimento quando do envio através do e-mail ou outro meio fornecido para contato pela própria empresa no prazo de 24 (vinte e quatro) horas ocasionará o recebimento tácito, a partir do qual será contabilizado o prazo de ${prazoText} dia(s), findo o qual as consequências do não atendimento a esta notificação terão prosseguimento.`
  };
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
  onInitialOrderHandled,
  onRegisterGeneratedNotification
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
  const [textoAntesItens, setTextoAntesItens] = useState('');
  const [textoDepoisItens, setTextoDepoisItens] = useState('');

  const orderNumber = selectedOrder?.orderNumber || manualOrderNumber;
  const companyName = selectedOrder?.companyName || manualCompanyName;
  const cnpj = selectedOrder?.cnpj || manualCnpj;
  const deliveryDate = selectedOrder?.expectedDeliveryDate ? formatBRDate(selectedOrder.expectedDeliveryDate) : manualDeliveryDate;
  const todayDate = new Date();
  const todayBr = formatDate(todayDate);
  const todayDisplay = todayDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const fillDefaultTexts = (order: PurchaseOrder | null = selectedOrder) => {
    const defaults = buildDefaultTexts(order, prazoDias, orgao, manualCompanyName, manualCnpj, manualOrderNumber, representante);
    setTextoAntesItens(defaults.beforeItems);
    setTextoDepoisItens(defaults.afterItems);
  };

  useEffect(() => {
    if (initialOrder) {
      setSelectedOrderId(initialOrder.id);
      const defaults = buildDefaultTexts(initialOrder, prazoDias, orgao, manualCompanyName, manualCnpj, manualOrderNumber, representante);
      setTextoAntesItens(defaults.beforeItems);
      setTextoDepoisItens(defaults.afterItems);
      onInitialOrderHandled?.();
    }
  }, [initialOrder, onInitialOrderHandled]);

  useEffect(() => {
    if (!textoAntesItens.trim() && !textoDepoisItens.trim()) {
      fillDefaultTexts(selectedOrder);
    }
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

  const selectManualNotification = () => {
    setSelectedOrderId('manual');
    const defaults = buildDefaultTexts(null, prazoDias, orgao, manualCompanyName, manualCnpj, manualOrderNumber, representante);
    setTextoAntesItens(defaults.beforeItems);
    setTextoDepoisItens(defaults.afterItems);
  };

  const selectOrderNotification = (order: PurchaseOrder) => {
    setSelectedOrderId(order.id);
    const defaults = buildDefaultTexts(order, prazoDias, orgao, manualCompanyName, manualCnpj, manualOrderNumber, representante);
    setTextoAntesItens(defaults.beforeItems);
    setTextoDepoisItens(defaults.afterItems);
  };

  const resetText = () => {
    fillDefaultTexts(selectedOrder);
  };

  const renderEditableOrText = (value: string, setter: (value: string) => void, placeholder: string, className = 'w-[70%]') => {
    if (!isManual) return value || placeholder;
    return (
      <input
        value={value}
        onChange={(event) => setter(event.target.value)}
        placeholder={placeholder}
        className={`${className} border-0 border-b border-dashed border-slate-300 px-1 font-bold outline-none focus:border-slate-700`}
      />
    );
  };

  const handleGeneratePdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const headerUrl = new URL(notificationHeader, window.location.origin).href;

    printWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Notificação Administrativa - ${escapeHtml(orderNumber || 'manual')}</title>
  <style>
    @page { size: A4; margin: 14mm 18mm 16mm; }
    * { box-sizing: border-box; }
    body { color: #111; font-family: 'Times New Roman', Times, serif; font-size: 10.7pt; line-height: 1.22; margin: 0; }
    .page { max-width: 174mm; margin: 0 auto; }
    header { text-align: center; margin: 0 0 8px; }
    header img { width: 82mm; max-width: 100%; height: auto; object-fit: contain; }
    h1 { font-size: 10.5pt; margin: 4px 0 18px; text-align: center; text-transform: uppercase; font-weight: 700; }
    p { margin: 0 0 8px; text-align: justify; }
    .process { margin: 0 0 14px; font-weight: 700; text-transform: uppercase; }
    .process p { margin: 0 0 2px; text-align: left; }
    .meta { margin: 0 0 14px; }
    .meta p { margin: 0 0 6px; text-align: left; }
    .meta strong { text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 9.8pt; }
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
    <header><img src="${headerUrl}" alt="Prefeitura Municipal de Pereiro" /></header>
    <h1>Notificação Administrativa</h1>
    <section class="process">
      ${processo ? `<p>Pregão Eletrônico nº ${escapeHtml(processo)}</p>` : ''}
      ${contrato ? `<p>Contrato nº ${escapeHtml(contrato)}</p>` : ''}
    </section>
    <section class="meta">
      <p><strong>Notificante:</strong> ${escapeHtml(orgao || '[órgão notificante]')}, neste ato representado pelo seu Fiscal de contrato, o Sr. ${escapeHtml(fiscal || '[fiscal]')}</p>
      <p><strong>Notificado:</strong> ${escapeHtml(companyName || '[empresa notificada]')}${cnpj ? `, CNPJ sob o nº ${escapeHtml(cnpj)}` : ''}${endereco ? `, com endereço na ${escapeHtml(endereco)}` : ''}${representante ? `, representado por ${escapeHtml(representante)}` : ''}.</p>
      ${orderNumber ? `<p><strong>Ordem de Compra:</strong> ${escapeHtml(orderNumber)}</p>` : ''}
      ${deliveryDate ? `<p><strong>Entrega prevista:</strong> ${escapeHtml(deliveryDate)}</p>` : ''}
      ${emailEnvio ? `<p><strong>E-mail de envio:</strong> ${escapeHtml(emailEnvio)}</p>` : ''}
    </section>
    <section>${paragraphHtml(textoAntesItens)}</section>
    ${buildItemsTable(pendingItems)}
    <section>${paragraphHtml(textoDepoisItens)}</section>
    <p class="date">Pereiro/CE, em ${escapeHtml(todayDisplay)}.</p>
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

    const deadlineDays = Math.max(1, Number(prazoDias) || 1);
    onRegisterGeneratedNotification?.({
      id: `not-adm-${Date.now()}`,
      orderId: selectedOrder?.id,
      orderNumber: orderNumber || 'Manual',
      companyName: companyName || 'Empresa nao informada',
      cnpj: cnpj || '',
      sentDate: todayBr,
      responseDeadline: formatDate(addDays(todayDate, deadlineDays)),
      deadlineDays,
      status: 'Pendente',
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-600" />
            <span>Notificação Administrativa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Modelo oficial editável com texto, tabela de itens e geração em PDF.</p>
        </div>
        <button
          onClick={handleGeneratePdf}
          disabled={!textoAntesItens.trim() && !textoDepoisItens.trim()}
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
              <p className="text-[11px] text-slate-500 mt-0.5">Crie manualmente ou selecione uma ordem atrasada.</p>
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
                onClick={() => selectOrderNotification(order)}
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
          <div className="mx-auto bg-white text-black shadow-lg border border-slate-300 w-full max-w-[900px] min-h-[1180px] px-8 sm:px-16 py-10 text-[15px] leading-[1.35]" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <h2 className="text-center uppercase font-bold text-sm mb-7">Notificação Administrativa</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5 font-bold uppercase text-[13px]">
              <input value={processo} onChange={(e) => setProcesso(e.target.value)} placeholder="Pregão Eletrônico nº" className="border-0 border-b border-dashed border-slate-300 px-1 py-1 font-bold outline-none focus:border-slate-700" />
              <input value={contrato} onChange={(e) => setContrato(e.target.value)} placeholder="Contrato nº" className="border-0 border-b border-dashed border-slate-300 px-1 py-1 font-bold outline-none focus:border-slate-700" />
            </div>

            <div className="space-y-2 mb-5 text-[14px]">
              <p><strong>NOTIFICANTE:</strong> <input value={orgao} onChange={(e) => setOrgao(e.target.value)} className="w-[70%] border-0 border-b border-dashed border-slate-300 px-1 font-bold outline-none focus:border-slate-700" /></p>
              <p><strong>NOTIFICADO:</strong> {renderEditableOrText(companyName, setManualCompanyName, 'Empresa notificada')}</p>
              <p><strong>CNPJ:</strong> {renderEditableOrText(cnpj, setManualCnpj, '00.000.000/0001-00', 'w-[42%]')}</p>
              <p><strong>REPRESENTANTE:</strong> <input value={representante} onChange={(e) => setRepresentante(e.target.value)} className="w-[70%] border-0 border-b border-dashed border-slate-300 px-1 font-bold outline-none focus:border-slate-700" /></p>
              <p><strong>ENDEREÇO:</strong> <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-[78%] border-0 border-b border-dashed border-slate-300 px-1 font-bold outline-none focus:border-slate-700" /></p>
              <p><strong>ORDEM DE COMPRA:</strong> {renderEditableOrText(orderNumber, setManualOrderNumber, 'número da ordem', 'w-[32%]')} <span className="ml-3"><strong>ENTREGA:</strong> {renderEditableOrText(deliveryDate, setManualDeliveryDate, 'data prevista', 'w-[28%]')}</span></p>
              <p><strong>E-MAIL DE ENVIO:</strong> <input value={emailEnvio} onChange={(e) => setEmailEnvio(e.target.value)} className="w-[62%] border-0 border-b border-dashed border-slate-300 px-1 font-bold outline-none focus:border-slate-700" /></p>
              <p><strong>PRAZO:</strong> <input type="number" min="1" value={prazoDias} onChange={(e) => setPrazoDias(e.target.value)} className="w-20 border-0 border-b border-dashed border-slate-300 px-1 text-center font-bold outline-none focus:border-slate-700" /> dia(s)</p>
            </div>

            <AutoGrowTextarea
              value={textoAntesItens}
              onChange={setTextoAntesItens}
              minHeight={185}
            />

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="uppercase font-bold text-[13px]">Itens pendentes de entrega</h3>
                <div className="flex items-center gap-2 print:hidden">
                  <button onClick={resetText} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer">
                    <RefreshCw className="w-3 h-3" />
                    <span>Repreencher texto</span>
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
                      <td className="border border-slate-700 p-1"><input value={item.item} onChange={(e) => updatePendingItem(item.id, 'item', e.target.value)} placeholder={String(index + 1)} className="w-full text-center font-bold outline-none" /></td>
                      <td className="border border-slate-700 p-1"><input value={item.description} onChange={(e) => updatePendingItem(item.id, 'description', e.target.value)} className="w-full font-bold outline-none" /></td>
                      <td className="border border-slate-700 p-1"><input value={item.unit} onChange={(e) => updatePendingItem(item.id, 'unit', e.target.value)} className="w-full text-center font-bold outline-none" /></td>
                      <td className="border border-slate-700 p-1"><input value={item.quantity} onChange={(e) => updatePendingItem(item.id, 'quantity', e.target.value)} className="w-full text-center font-bold outline-none" /></td>
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

            <AutoGrowTextarea
              value={textoDepoisItens}
              onChange={setTextoDepoisItens}
              minHeight={560}
              className="mt-4"
            />

            <p className="text-right mt-8">Pereiro/CE, em {todayDisplay}.</p>
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
