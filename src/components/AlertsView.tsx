import React, { useState, useRef } from 'react';
import {
  BellRing,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Calendar,
  Search,
  ArrowRight,
  Printer,
  FileText,
  Edit3,
  Save,
  Download,
  Bold,
  Italic,
  Underline,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RotateCcw,
  CheckCircle2,
  Upload,
  FileUp
} from 'lucide-react';
import { Contract, ServiceNote, ContractAmendment, ActiveTab } from '../types';

interface AlertsViewProps {
  contracts: Contract[];
  notes: ServiceNote[];
  amendments: ContractAmendment[];
  onNavigateTab: (tab: ActiveTab) => void;
  onPrintContract?: (contract: Contract) => void;
}

const DEFAULT_DOCUMENT_CONTENT = `PREFEITURA MUNICIPAL DE PEREIRO
CENTRO ADMINISTRATIVO JOSÉ ESTEVAM
Rua Marta Silveira Maciel, nº. 04, Centro, Pereiro, Ceará
Tel.: (88) 3527-1250 / (88) 3527-1260 - E-mail: prefeiturapereiro@gmail.com
CNPJ: 07.570.518/0001-00

REQUERIMENTO DE INSTAURAÇÃO DE PROCESSO ADMINISTRATIVO

SECRETARIA DE SAÚDE E SANEAMENTO, do município de Pereiro/CE, inscrita no CNPJ nº 11.265.959/0001-75, localizada Rua Marta Silveira Maciel, nº. 04, Centro, CEP: 63.460-000, Pereiro/CE, neste ato representada pelo seu Fiscal de Contrato, o Sr. Francisco Álamo Carlos Rocha, COMUNICA que esta secretaria firmou o contrato nº 01.07.03/2025, com a empresa AGM COMERCIO E SERVIÇOS TECNICOS LTDA, com endereço na Avenida Dom Aureliano Matos, nº 1684, centro, cep: 62930-000, Limoeiro do Norte-CE, inscrita no CNPJ sob nº. 01.574.288/0001-70, representada por ANANIAS GOMES DA SILVA FILHO, CPF nº 430.143.563-87, após a conclusão do PREGÃO ELETRÔNICO Nº 0512.01/2025.

Foram enviadas, pela notificante, ordens (nº. da ordem: [2025.11.07-0001] e data [07/11/2025]) de compra de medicamentos, pertencentes a lista da ABC FARMA, as quais continham os itens abaixo:

Item | Especificação | Unid. | Quant. | Vl. Unit. | Vl. Total | Nota Fiscal nº.
01 | NOTEBOOK INTEL CORE I5 DE 11ª GERAÇÃO; PLACA DE VÍDEO: ITEL HD GRAPHICS 620; MEMÓRIA: 16 GB;HD: 480 SSD; TELA: FULL HD DE 15,6”; WEBCAM: HD 720P; WIFI 802.11AC DUAL BAND 2.4/5.0 E BLUETOOTH E ETHERNET GIGABT (100/1000); SISTEMA: OPERACINAL WINDOWS 10 PRO E PACOTE OFFICE 365 ORIGINAL INSTALADO E LICENCIADO, NAVEGADORES FIREFOX E GOOGLE; PORTAS HDMI E ETHERNET GIGABIT, 02 USB 3.0 E 01 USB-C THUDERBOLT COM LEITOR DE MEMÓRIA | Und | 1 | R$ 4.149,18 | R$ 4.149,18 | [5.145]

O equipamento citado foi entregue corretamente no prazo de 20 (vinte) dias corridos a contar da data do envio da ordem de compra/serviço, conforme prazo previsto em contrato. Porém, o valor referente a nota fiscal de nº. [5.145], que soma um total de [R$ 4.149,18] não foram pagos, e visto que a prestação dos serviços foi concluída sem o devido pagamento da nota fiscal, por conseguinte o município está impossibilitado de realizar o pagamento desta em decorrência do envio SIM.

Protesta provar o alegado por todos os meios de provas admitidos, especialmente a prova documental anexa, qual seja cópia do contrato, Ordens de compra, e notificação administrativa, além das demais provas que se fizerem necessárias ao longo do processo.

Atenciosamente,
Pereiro/CE, [15 de junho de 2026].

Francisco Álamo Carlos Rocha
Fiscal de Contratos
Portaria: [2026.2.06.1-SRH]`;

export const AlertsView: React.FC<AlertsViewProps> = ({
  contracts,
  notes,
  amendments,
  onNavigateTab,
  onPrintContract
}) => {
  const [subView, setSubView] = useState<'notifications' | 'editor'>('editor');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Word Online Editor state
  const [documentText, setDocumentText] = useState<string>(() => {
    return localStorage.getItem('fiscalpro_word_doc') || DEFAULT_DOCUMENT_CONTENT;
  });
  const [docTitle, setDocTitle] = useState<string>('Requerimento de Instauração - Contrato 01.07.03-2025.docx');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleSaveDoc = () => {
    localStorage.setItem('fiscalpro_word_doc', documentText);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDoc = () => {
    if (window.confirm('Deseja restaurar o texto original padrão do requerimento?')) {
      setDocumentText(DEFAULT_DOCUMENT_CONTENT);
      localStorage.setItem('fiscalpro_word_doc', DEFAULT_DOCUMENT_CONTENT);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Img = uploadEvent.target?.result as string;
        if (base64Img) {
          const imgMarkdown = `\n\n[IMAGEM / ASSINATURA: ${file.name}]\n<img src="${base64Img}" alt="${file.name}" style="max-width: 100%; height: auto; margin: 15px auto; display: block;" />\n\n`;
          setDocumentText((prev) => prev + imgMarkdown);
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Read text / PDF / doc
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const content = uploadEvent.target?.result as string;
        if (content) {
          setDocumentText(content);
          setDocTitle(file.name);
        }
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Img = uploadEvent.target?.result as string;
        if (base64Img) {
          const imgMarkdown = `\n\n[IMAGEM / ASSINATURA: ${file.name}]\n<img src="${base64Img}" alt="${file.name}" style="max-width: 100%; height: auto; margin: 15px auto; display: block;" />\n\n`;
          setDocumentText((prev) => prev + imgMarkdown);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const content = uploadEvent.target?.result as string;
        if (content) {
          setDocumentText(content);
          setDocTitle(file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePrintDoc = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${docTitle}</title>
            <style>
              body { font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.6; margin: 40px; color: #000; }
              div { white-space: pre-wrap; font-family: 'Times New Roman', Times, serif; font-size: 14pt; }
              img { max-width: 100%; height: auto; display: block; margin: 15px auto; }
              .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h3>PREFEITURA MUNICIPAL DE PEREIRO</h3>
              <h4>CENTRO ADMINISTRATIVO JOSÉ ESTEVAM</h4>
            </div>
            <div>${documentText.replace(/\n/g, '<br/>')}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  // Helper to parse DD/MM/YYYY date
  const parseBRDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  };

  const getDaysUntil = (dateStr: string): number | null => {
    const target = parseBRDate(dateStr);
    if (!target) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const contractAlerts = contracts
    .map((c) => {
      const days = getDaysUntil(c.endDate);
      const isExpiring = c.status === 'A Vencer' || (days !== null && days <= 90);
      if (!isExpiring) return null;
      const d = parseBRDate(c.endDate);
      return {
        id: `contract-alert-${c.id}`,
        title: `Contrato Nº ${c.contractNum} Próximo do Vencimento`,
        contractNum: c.contractNum,
        creditor: c.creditor,
        desc: days !== null && days < 0
          ? `O contrato venceu há ${Math.abs(days)} dias (${c.endDate}). Regularize imediatamente.`
          : `Restam ${days !== null ? days : 'poucos'} dias para o encerramento da vigência em ${c.endDate}.`,
        level: days !== null && days <= 30 ? 'high' : 'medium',
        dateObj: d,
        month: d ? d.getMonth() + 1 : null,
        time: c.endDate,
        linkTab: 'aditivos'
      };
    })
    .filter(Boolean);

  const noteAlerts = notes
    .slice(0, 15)
    .map((n) => {
      const d = parseBRDate(n.issueDate);
      return {
        id: `note-alert-${n.id}`,
        title: `Nota de Serviço Nº ${n.noteNumber}`,
        contractNum: n.contractNum,
        creditor: n.creditor,
        desc: `Nota fiscal/serviço emitida no valor de R$ ${n.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${n.status}).`,
        level: n.status === 'Penta' || n.status === 'Paga' ? 'info' : 'medium',
        dateObj: d,
        month: d ? d.getMonth() + 1 : null,
        time: n.issueDate,
        linkTab: 'notas'
      };
    });

  const allAlerts = [...contractAlerts, ...noteAlerts];

  const filteredAlerts = allAlerts.filter((al: any) => {
    const monthMatch = selectedMonth === 'all' || al.month === selectedMonth;
    const searchMatch =
      !searchTerm ||
      al.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      al.creditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      al.contractNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      al.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return monthMatch && searchMatch;
  });

  const monthsList = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  return (
    <div className={`space-y-6 ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-100 p-6 overflow-y-auto' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Alertas & Editor de Documentos</h2>
          <p className="text-xs text-slate-500 mt-1">
            Gerenciamento de notificações e Editor Online de Documentos e Requerimentos Oficiais
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center bg-slate-200/70 p-1 rounded-xl">
          <button
            onClick={() => setSubView('editor')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              subView === 'editor'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Editor de Requerimento (Word Online)</span>
          </button>
          <button
            onClick={() => setSubView('notifications')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              subView === 'notifications'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BellRing className="w-4 h-4 text-amber-600" />
            <span>Notificações & Vencimentos ({allAlerts.length})</span>
          </button>
        </div>
      </div>

      {subView === 'editor' ? (
        /* Word Online Editor View */
        <div
          className={`bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col ${
            isFullScreen ? 'h-[calc(100vh-80px)]' : ''
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
        >
          {/* Drag & drop overlay indicator */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-emerald-900/80 z-50 flex flex-col items-center justify-center text-white space-y-3 pointer-events-none">
              <FileUp className="w-16 h-16 animate-bounce" />
              <p className="text-lg font-bold">Solte o arquivo PDF ou Word aqui para carregar no editor</p>
            </div>
          )}

          {/* Word Ribbon Header */}
          <div className="bg-[#1b5e20] text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="bg-transparent text-white text-xs font-bold focus:bg-white/10 px-2 py-0.5 rounded outline-none border-b border-transparent focus:border-white/40"
                  title="Clique para renomear o documento"
                />
                <p className="text-[10px] text-emerald-200 px-2">Microsoft Word Online • Prefeitura Municipal de Pereiro</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {savedSuccess && (
                <span className="flex items-center space-x-1 text-[11px] font-semibold bg-emerald-700 text-white px-2.5 py-1 rounded-lg animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Salvo com sucesso!</span>
                </span>
              )}
              <input
                type="file"
                ref={docInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,image/*"
                className="hidden"
              />
              <button
                onClick={() => docInputRef.current?.click()}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                title="Arraste ou selecione PDF / Word / Imagem"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Carregar PDF / Arquivo</span>
              </button>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                title={isFullScreen ? 'Restaurar tela' : 'Expandir tela inteira'}
              >
                {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullScreen ? 'Restaurar' : 'Expandir Tela'}</span>
              </button>
              <button
                onClick={handleResetDoc}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                title="Restaurar texto oficial"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>
              <button
                onClick={handlePrintDoc}
                className="flex items-center space-x-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                title="Imprimir / Salvar PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / PDF</span>
              </button>
              <button
                onClick={handleSaveDoc}
                className="flex items-center space-x-1 px-4 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>

          {/* Ribbon Toolbar */}
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 border-r border-slate-200 pr-3">
                <span className="font-semibold text-slate-500">Página:</span>
                <span className="font-bold text-slate-800">A4 Oficial</span>
              </div>
              <div className="flex items-center space-x-1 border-r border-slate-200 pr-3">
                <span className="font-semibold text-slate-500">Fonte:</span>
                <select className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium">
                  <option>Times New Roman</option>
                  <option>Arial</option>
                  <option>Calibri</option>
                </select>
              </div>
              <div className="flex items-center space-x-1">
                <span className="inline-block w-3 h-3 bg-yellow-200 border border-yellow-400 rounded-xs"></span>
                <span className="text-[11px] text-slate-600 font-medium">= Campos destacados para preenchimento</span>
              </div>
            </div>
            <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              📁 Dica: Você pode arrastar arquivos PDF, Word ou imagens diretamente para esta tela.
            </div>
          </div>

          {/* Document Canvas (A4 Paper Simulation) */}
          <div className="p-8 flex justify-center overflow-y-auto flex-1">
            <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[25mm] shadow-2xl rounded border border-slate-200 relative">
              {/* Official Coat of Arms Header */}
              <div className="text-center border-b-2 border-emerald-800 pb-4 mb-6">
                <div className="flex justify-center items-center space-x-2 mb-1">
                  <div className="w-10 h-10 bg-emerald-800 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    PM
                  </div>
                </div>
                <h3 className="text-sm font-extrabold text-emerald-900 tracking-wider">PREFEITURA MUNICIPAL DE PEREIRO</h3>
                <h4 className="text-xs font-bold text-slate-700">CENTRO ADMINISTRATIVO JOSÉ ESTEVAM</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Rua Marta Silveira Maciel, nº. 04, Centro, Pereiro, Ceará • Tel.: (88) 3527-1250 • CNPJ: 07.570.518/0001-00
                </p>
              </div>

              {/* Editable Area with Yellow Highlights styling hint */}
              <textarea
                id="word-editor-textarea"
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                className={`w-full ${isFullScreen ? 'h-[750px]' : 'h-[650px]'} resize-y font-serif text-sm leading-relaxed text-slate-900 bg-transparent outline-none border border-dashed border-slate-200 p-4 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 whitespace-pre-wrap rounded`}
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              />

              <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>Documento Oficial Gerado por FiscalPro</span>
                <span>Página 1 de 1</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Notifications View */
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-700">Mês de Vencimento:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-transparent text-slate-900 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all">Todos os Meses</option>
                {monthsList.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por contrato, credor ou termo..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <BellRing className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Nenhum alerta para o filtro selecionado</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Todos os contratos e notas estão dentro dos prazos regulamentares ou o mês selecionado não possui pendências.
              </p>
              <button
                onClick={() => { setSelectedMonth('all'); setSearchTerm(''); }}
                className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer inline-block"
              >
                Ver Todos os Alertas
              </button>
            </div>
          ) : (
            filteredAlerts.map((al: any) => (
              <div
                key={al.id}
                className={`p-5 rounded-2xl border bg-white shadow-xs flex items-start space-x-4 transition-all hover:shadow-sm ${
                  al.level === 'high'
                    ? 'border-rose-200 bg-rose-50/10'
                    : al.level === 'medium'
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-slate-200/80'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    al.level === 'high'
                      ? 'bg-rose-100 text-rose-700'
                      : al.level === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">{al.title}</h4>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                      Vencimento: {al.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{al.desc}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded">
                        {al.contractNum}
                      </span>
                      <span className="text-slate-600 font-semibold">{al.creditor}</span>
                    </div>
                    <button
                      onClick={() => onNavigateTab(al.linkTab as ActiveTab)}
                      className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1 cursor-pointer bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100"
                    >
                      <span>Gerenciar / Aditivar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
