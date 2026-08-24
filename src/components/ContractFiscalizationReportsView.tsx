import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, FileText, Plus, Printer, Receipt, Save, Search, Trash2 } from 'lucide-react';
import { Contract, ContractAmendment, Creditor, FiscalPortaria, ServiceNote } from '../types';

interface Props {
  contracts: Contract[];
  notes: ServiceNote[];
  creditors: Creditor[];
  fiscais: FiscalPortaria[];
  amendments: ContractAmendment[];
}

type CheckValue = 'sim' | 'nao' | 'na';
type ObjectFulfillmentValue = '' | 'total' | 'parcial' | 'insatisfatorio';
type ContractorPerformanceValue = '' | 'otimo' | 'bom' | 'regular' | 'ruim';
type AdditiveNeedValue = '' | 'sim' | 'nao';
type ChecklistObservations = Record<string, string>;

interface GeneralChecks {
  validVigency: CheckValue;
  formalAdditive: CheckValue;
  updatedDocuments: CheckValue;
}

interface ObjectExecutionChecks {
  objectAsContracted: CheckValue;
  deadlinesMet: CheckValue;
  hasFailures: CheckValue;
  sanctionsApplied: CheckValue;
  measurementsMade: CheckValue;
}

interface InvoicePaymentChecks {
  invoicesMatchDelivery: CheckValue;
  liquidationProof: CheckValue;
  legalPaymentDeadlines: CheckValue;
  taxWithholdingsRegistered: CheckValue;
}

interface DocumentManagementChecks {
  reportsArchived: CheckValue;
  communicationsRegistered: CheckValue;
  occurrencesControlUpdated: CheckValue;
  meetingRecords: CheckValue;
}

interface PeriodEvaluation {
  objectFulfillment: ObjectFulfillmentValue;
  contractorPerformance: ContractorPerformanceValue;
  correctiveActions: string;
  contractualAdditiveNeeded: AdditiveNeedValue;
}

interface ReportAmendmentInfo {
  id: string;
  amendmentNum: string;
  type: string;
  status: string;
  signatureDate: string;
  publicationDate?: string;
  justification: string;
}

interface FiscalizationReport {
  id: string;
  createdAt: string;
  contractNum: string;
  contractObject: string;
  validity: string;
  supplyOrder: string;
  contractor: string;
  contractorDocument: string;
  fiscalName: string;
  fiscalOrgan: string;
  fiscalPortaria: string;
  inspectionStartDate?: string;
  inspectionEndDate?: string;
  generalChecks?: GeneralChecks;
  objectExecutionChecks?: ObjectExecutionChecks;
  invoicePaymentChecks?: InvoicePaymentChecks;
  documentManagementChecks?: DocumentManagementChecks;
  checklistObservations?: ChecklistObservations;
  periodEvaluation?: PeriodEvaluation;
  selectedAmendment?: ReportAmendmentInfo;
  noteIds: string[];
  notesTotal: number;
}

const STORAGE_KEY = 'fiscalpro_contract_fiscalization_reports';

const DEFAULT_CHECKS: GeneralChecks = {
  validVigency: 'na',
  formalAdditive: 'na',
  updatedDocuments: 'na'
};

const OBJECT_EXECUTION_DEFAULT_CHECKS: ObjectExecutionChecks = {
  objectAsContracted: 'na',
  deadlinesMet: 'na',
  hasFailures: 'na',
  sanctionsApplied: 'na',
  measurementsMade: 'na'
};

const INVOICE_PAYMENT_DEFAULT_CHECKS: InvoicePaymentChecks = {
  invoicesMatchDelivery: 'na',
  liquidationProof: 'na',
  legalPaymentDeadlines: 'na',
  taxWithholdingsRegistered: 'na'
};

const DOCUMENT_MANAGEMENT_DEFAULT_CHECKS: DocumentManagementChecks = {
  reportsArchived: 'na',
  communicationsRegistered: 'na',
  occurrencesControlUpdated: 'na',
  meetingRecords: 'na'
};

const PERIOD_EVALUATION_DEFAULT: PeriodEvaluation = {
  objectFulfillment: '',
  contractorPerformance: '',
  correctiveActions: '',
  contractualAdditiveNeeded: ''
};

const GENERAL_CHECK_ITEMS: Array<{ key: keyof GeneralChecks; number: string; label: string }> = [
  {
    key: 'validVigency',
    number: '3.1.1',
    label: 'O contrato possui vigência e está dentro do prazo?'
  },
  {
    key: 'formalAdditive',
    number: '3.1.2',
    label: 'Houve prorrogação ou aditivo formalizado e publicado?'
  },
  {
    key: 'updatedDocuments',
    number: '3.1.3',
    label: 'A contratada mantém documentação de habilitação atualizada: FGTS, INSS, CND, CNDT etc.?'
  }
];

const OBJECT_EXECUTION_CHECK_ITEMS: Array<{ key: keyof ObjectExecutionChecks; number: string; label: string }> = [
  {
    key: 'objectAsContracted',
    number: '3.2.1',
    label: 'O objeto contratado está sendo executado conforme o contrato?'
  },
  {
    key: 'deadlinesMet',
    number: '3.2.2',
    label: 'Os prazos de entrega ou execução estão sendo cumpridos?'
  },
  {
    key: 'hasFailures',
    number: '3.2.3',
    label: 'Há registro de falhas, atrasos ou não conformidades?'
  },
  {
    key: 'sanctionsApplied',
    number: '3.2.4',
    label: 'Houve aplicação de sanções ou advertências à contratada?'
  },
  {
    key: 'measurementsMade',
    number: '3.2.5',
    label: 'Foram realizadas medições ou relatórios de execução física e financeira?'
  }
];

const INVOICE_PAYMENT_CHECK_ITEMS: Array<{ key: keyof InvoicePaymentChecks; number: string; label: string }> = [
  {
    key: 'invoicesMatchDelivery',
    number: '3.3.1',
    label: 'As notas fiscais correspondem aos serviços/produtos efetivamente entregues?'
  },
  {
    key: 'liquidationProof',
    number: '3.3.2',
    label: 'Há comprovação da liquidação da despesa?'
  },
  {
    key: 'legalPaymentDeadlines',
    number: '3.3.3',
    label: 'Foram observados os prazos legais de pagamento?'
  },
  {
    key: 'taxWithholdingsRegistered',
    number: '3.3.4',
    label: 'Há retenções de INSS, ISS, IR, PIS/COFINS e CSLL devidamente registradas?'
  }
];

const DOCUMENT_MANAGEMENT_CHECK_ITEMS: Array<{ key: keyof DocumentManagementChecks; number: string; label: string }> = [
  {
    key: 'reportsArchived',
    number: '3.4.1',
    label: 'Os relatórios de acompanhamento estão sendo arquivados no processo do contrato?'
  },
  {
    key: 'communicationsRegistered',
    number: '3.4.2',
    label: 'As comunicações entre fiscal e contratada estão registradas por ofício ou e-mail?'
  },
  {
    key: 'occurrencesControlUpdated',
    number: '3.4.3',
    label: 'Existe controle atualizado de ocorrências em planilha ou sistema?'
  },
  {
    key: 'meetingRecords',
    number: '3.4.4',
    label: 'Há registro de reuniões de acompanhamento, quando realizadas?'
  }
];

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Date().toLocaleDateString('pt-BR');
const norm = (value = '') =>
  value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const answerLabel = (value?: CheckValue) => {
  if (value === 'sim') return 'Sim';
  if (value === 'nao') return 'Não';
  return 'N/A';
};

const objectFulfillmentLabel = (value?: ObjectFulfillmentValue) => {
  if (value === 'parcial') return 'Parcial';
  if (value === 'insatisfatorio') return 'Insatisfatório';
  if (value === 'total') return 'Total';
  return '-';
};

const contractorPerformanceLabel = (value?: ContractorPerformanceValue) => {
  if (value === 'otimo') return 'Ótimo';
  if (value === 'regular') return 'Regular';
  if (value === 'ruim') return 'Ruim';
  if (value === 'bom') return 'Bom';
  return '-';
};

const additiveNeedLabel = (value?: AdditiveNeedValue) => {
  if (value === 'sim') return 'Sim';
  if (value === 'nao') return 'Não';
  return '-';
};

const checklistItemId = (section: string, key: string) => `${section}.${key}`;

const ChecklistFormItem = <K extends string>({
  section,
  item,
  value,
  observation,
  onCheckChange,
  onObservationChange
}: {
  section: string;
  item: { key: K; number: string; label: string };
  value: CheckValue;
  observation: string;
  onCheckChange: (key: K, value: CheckValue) => void;
  onObservationChange: (id: string, value: string) => void;
}) => {
  const id = checklistItemId(section, item.key);
  const showObservation = value === 'sim' || value === 'nao';

  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-medium text-emerald-700">Item {item.number}</span>
          <p className="text-xs font-medium text-slate-800 mt-0.5">{item.label}</p>
        </div>
        <CheckSelector value={value} onChange={(nextValue) => onCheckChange(item.key, nextValue)} />
      </div>
      {showObservation && (
        <label className="block space-y-1.5">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Observações</span>
          <textarea
            value={observation}
            onChange={(event) => onObservationChange(id, event.target.value)}
            rows={3}
            placeholder="Digite a observação deste item"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y"
          />
        </label>
      )}
    </div>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
    <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
    <p className="text-xs font-medium text-slate-900 mt-1">{value}</p>
  </div>
);

const SectionTitle: React.FC<{ number: string; title: string; desc?: string }> = ({ number, title, desc }) => (
  <div className="flex flex-col gap-1">
    <h2 className="text-sm font-medium text-slate-800">
      <span className="text-emerald-700">{number}</span> {title}
    </h2>
    {desc && <p className="text-xs text-slate-500">{desc}</p>}
  </div>
);

const CheckSelector: React.FC<{
  value: CheckValue;
  onChange: (value: CheckValue) => void;
}> = ({ value, onChange }) => (
  <div className="grid grid-cols-3 gap-1.5 w-full sm:w-52">
    {(['sim', 'nao', 'na'] as CheckValue[]).map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        className={`px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
          value === option
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        {answerLabel(option)}
      </button>
    ))}
  </div>
);


const ChoiceSelector = <T extends string>({
  value,
  options,
  onChange,
  className = 'sm:w-80'
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}) => (
  <div className={`grid gap-1.5 w-full ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
          value === option.value
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const PrintInfoTable: React.FC<{ rows: Array<[string, string]> }> = ({ rows }) => (
  <table className="w-full border-collapse text-[10.5px]">
    <tbody>
      {rows.map(([label, value]) => (
        <tr key={label}>
          <th className="w-44 border border-slate-400 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-800 align-top">{label}</th>
          <td className="border border-slate-400 px-2 py-1.5 text-slate-900 align-top">{value || '-'}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const PrintChecklistTable: React.FC<{
  title: string;
  items: Array<{ number: string; label: string; answer: string; observation?: string }>;
}> = ({ title, items }) => (
  <div className="break-inside-avoid">
    <h3 className="border border-slate-400 bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-900">{title}</h3>
    <table className="w-full border-collapse text-[10.5px]">
      <thead>
        <tr>
          <th className="w-16 border border-slate-400 px-2 py-1.5 text-left font-semibold">Item</th>
          <th className="border border-slate-400 px-2 py-1.5 text-left font-semibold">Critério avaliado</th>
          <th className="w-20 border border-slate-400 px-2 py-1.5 text-center font-semibold">Resposta</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.number}>
            <td className="border border-slate-400 px-2 py-1.5 font-medium align-top">{item.number}</td>
            <td className="border border-slate-400 px-2 py-1.5 align-top">
              <div>{item.label}</div>
              {item.observation && <div className="mt-1 text-[9.5px] leading-relaxed text-slate-700"><strong>Observações:</strong> {item.observation}</div>}
            </td>
            <td className="border border-slate-400 px-2 py-1.5 text-center font-medium align-top">{item.answer}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const ContractFiscalizationReportsView: React.FC<Props> = ({ contracts, notes, creditors, fiscais, amendments }) => {
  const [reports, setReports] = useState<FiscalizationReport[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [mode, setMode] = useState<'list' | 'create' | 'view'>('list');
  const [selectedContractNum, setSelectedContractNum] = useState('');
  const [supplyOrder, setSupplyOrder] = useState('');
  const [selectedFiscalId, setSelectedFiscalId] = useState(fiscais[0]?.id || '');
  const [inspectionStartDate, setInspectionStartDate] = useState('');
  const [inspectionEndDate, setInspectionEndDate] = useState('');
  const [generalChecks, setGeneralChecks] = useState<GeneralChecks>(DEFAULT_CHECKS);
  const [objectExecutionChecks, setObjectExecutionChecks] = useState<ObjectExecutionChecks>(OBJECT_EXECUTION_DEFAULT_CHECKS);
  const [invoicePaymentChecks, setInvoicePaymentChecks] = useState<InvoicePaymentChecks>(INVOICE_PAYMENT_DEFAULT_CHECKS);
  const [documentManagementChecks, setDocumentManagementChecks] = useState<DocumentManagementChecks>(DOCUMENT_MANAGEMENT_DEFAULT_CHECKS);
  const [checklistObservations, setChecklistObservations] = useState<ChecklistObservations>({});
  const [periodEvaluation, setPeriodEvaluation] = useState<PeriodEvaluation>(PERIOD_EVALUATION_DEFAULT);
  const [selectedAmendmentId, setSelectedAmendmentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);


  useEffect(() => {
    if (!selectedFiscalId && fiscais[0]) setSelectedFiscalId(fiscais[0].id);
  }, [fiscais, selectedFiscalId]);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.contractNum === selectedContractNum) || null,
    [contracts, selectedContractNum]
  );

  const selectedCreditor = useMemo(() => {
    if (!selectedContract) return null;
    return creditors.find((creditor) => norm(creditor.name) === norm(selectedContract.creditor)) || null;
  }, [creditors, selectedContract]);

  const selectedNotes = useMemo(
    () =>
      selectedContractNum
        ? notes
            .filter((note) => norm(note.contractNum) === norm(selectedContractNum))
            .sort((a, b) => a.noteNumber.localeCompare(b.noteNumber, 'pt-BR', { numeric: true }))
        : [],
    [notes, selectedContractNum]
  );

  const selectedContractAmendments = useMemo(
    () =>
      selectedContractNum
        ? amendments
            .filter((amendment) => norm(amendment.contractNum) === norm(selectedContractNum))
            .sort((a, b) => a.amendmentNum.localeCompare(b.amendmentNum, 'pt-BR', { numeric: true }))
        : [],
    [amendments, selectedContractNum]
  );

  const selectedAmendment = useMemo(
    () => selectedContractAmendments.find((amendment) => amendment.id === selectedAmendmentId) || null,
    [selectedContractAmendments, selectedAmendmentId]
  );

  const selectedFiscal = useMemo(
    () => fiscais.find((fiscal) => fiscal.id === selectedFiscalId) || null,
    [fiscais, selectedFiscalId]
  );

  const selectedNotesTotal = selectedNotes.reduce((total, note) => total + note.value, 0);
  const selectedReport = reports.find((report) => report.id === selectedReportId) || null;
  const selectedReportNotes = selectedReport ? notes.filter((note) => selectedReport.noteIds.includes(note.id)) : [];

  const filteredReports = useMemo(() => {
    const term = norm(searchTerm);
    if (!term) return reports;
    return reports.filter((report) =>
      [report.contractNum, report.contractor, report.contractorDocument, report.supplyOrder, report.fiscalName, report.fiscalPortaria]
        .some((value) => norm(value).includes(term))
    );
  }, [reports, searchTerm]);

  const updateGeneralCheck = (key: keyof GeneralChecks, value: CheckValue) => {
    setGeneralChecks((current) => ({ ...current, [key]: value }));
  };

  const updateObjectExecutionCheck = (key: keyof ObjectExecutionChecks, value: CheckValue) => {
    setObjectExecutionChecks((current) => ({ ...current, [key]: value }));
  };

  const updateInvoicePaymentCheck = (key: keyof InvoicePaymentChecks, value: CheckValue) => {
    setInvoicePaymentChecks((current) => ({ ...current, [key]: value }));
  };

  const updateDocumentManagementCheck = (key: keyof DocumentManagementChecks, value: CheckValue) => {
    setDocumentManagementChecks((current) => ({ ...current, [key]: value }));
  };

  const updateChecklistObservation = (id: string, value: string) => {
    setChecklistObservations((current) => ({ ...current, [id]: value }));
  };

  const updatePeriodEvaluation = <K extends keyof PeriodEvaluation>(key: K, value: PeriodEvaluation[K]) => {
    setPeriodEvaluation((current) => ({ ...current, [key]: value }));
  };

  const openCreate = () => {
    setMode('create');
    setSelectedReportId(null);
    setSupplyOrder('');
    setSelectedFiscalId(fiscais[0]?.id || '');
    setSelectedContractNum('');
    setInspectionStartDate('');
    setInspectionEndDate('');
    setGeneralChecks(DEFAULT_CHECKS);
    setObjectExecutionChecks(OBJECT_EXECUTION_DEFAULT_CHECKS);
    setInvoicePaymentChecks(INVOICE_PAYMENT_DEFAULT_CHECKS);
    setDocumentManagementChecks(DOCUMENT_MANAGEMENT_DEFAULT_CHECKS);
    setChecklistObservations({});
    setPeriodEvaluation(PERIOD_EVALUATION_DEFAULT);
    setSelectedAmendmentId('');
  };

  const saveReport = () => {
    if (!selectedContract) return;
    const report: FiscalizationReport = {
      id: crypto.randomUUID(),
      createdAt: today(),
      contractNum: selectedContract.contractNum,
      contractObject: selectedContract.object,
      validity: `${selectedContract.startDate || '-'} a ${selectedContract.endDate || '-'}`,
      supplyOrder: supplyOrder.trim() || 'Não informada',
      contractor: selectedContract.creditor,
      contractorDocument: selectedCreditor?.cnpj || 'Não informado',
      fiscalName: selectedFiscal?.name || 'Fiscal não selecionado',
      fiscalOrgan: selectedFiscal?.organ || 'Secretaria de Saúde',
      fiscalPortaria: selectedFiscal?.portaria || 'Pendente',
      inspectionStartDate,
      inspectionEndDate,
      generalChecks,
      objectExecutionChecks,
      invoicePaymentChecks,
      documentManagementChecks,
      checklistObservations,
      periodEvaluation,
      selectedAmendment: selectedAmendment
        ? {
            id: selectedAmendment.id,
            amendmentNum: selectedAmendment.amendmentNum,
            type: selectedAmendment.type,
            status: selectedAmendment.status,
            signatureDate: selectedAmendment.signatureDate,
            publicationDate: selectedAmendment.publicationDate,
            justification: selectedAmendment.justification
          }
        : undefined,
      noteIds: selectedNotes.map((note) => note.id),
      notesTotal: selectedNotesTotal
    };
    setReports((current) => [report, ...current]);
    setSelectedReportId(report.id);
    setMode('view');
  };

  const notesTable = (items: ServiceNote[]) => (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="py-3 px-4">Nota fiscal</th>
            <th className="py-3 px-4">Emissão</th>
            <th className="py-3 px-4">Atesto</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 px-4 text-center text-slate-400">
                Nenhuma nota fiscal encontrada para este contrato.
              </td>
            </tr>
          ) : (
            items.map((note) => (
              <tr key={note.id} className="hover:bg-slate-50/80">
                <td className="py-3 px-4 font-medium text-slate-900">{note.noteNumber}</td>
                <td className="py-3 px-4 text-slate-600">{note.issueDate || '-'}</td>
                <td className="py-3 px-4 text-slate-600">{note.attestationDate || '-'}</td>
                <td className="py-3 px-4 text-slate-600">{note.status}</td>
                <td className="py-3 px-4 text-right font-medium text-slate-900">{money(note.value)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  if (mode === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button onClick={() => setMode('list')} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
            <h1 className="text-xl font-medium text-slate-900">Criar Relatório de Fiscalização</h1>
            <p className="text-xs text-slate-500 mt-1">Preencha as etapas do relatório e salve para consulta posterior.</p>
          </div>
          <button onClick={saveReport} disabled={!selectedContract} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed">
            <Save className="w-4 h-4" />
            <span>Salvar relatório</span>
          </button>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
          <SectionTitle number="1" title="Dados do contrato" desc="Dados puxados após selecionar o contrato." />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Contrato</span>
              <select
                value={selectedContractNum}
                onChange={(event) => {
                  setSelectedContractNum(event.target.value);
                  setSelectedAmendmentId('');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">Selecione o contrato</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.contractNum}>{contract.contractNum} - {contract.creditor}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Ordem de fornecimento</span>
              <input value={supplyOrder} onChange={(event) => setSupplyOrder(event.target.value)} placeholder="Preencher manualmente" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Info label="Nº do contrato" value={selectedContract?.contractNum || '-'} />
            <Info label="Vigência" value={selectedContract ? `${selectedContract.startDate} a ${selectedContract.endDate}` : '-'} />
            <Info label="Contratado" value={selectedContract?.creditor || '-'} />
            <Info label="CPF/CNPJ" value={selectedCreditor?.cnpj || 'Não informado'} />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-700">Objeto do contrato</span>
            <div className="min-h-20 px-3 py-2 text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl">{selectedContract?.object || '-'}</div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <SectionTitle number="2" title="Dados do fiscal" desc="Selecione um fiscal cadastrado para puxar secretaria/órgão e portaria." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Fiscal cadastrado</span>
              <select value={selectedFiscalId} onChange={(event) => setSelectedFiscalId(event.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                <option value="">Selecione o fiscal</option>
                {fiscais.map((fiscal) => (
                  <option key={fiscal.id} value={fiscal.id}>{fiscal.name} - {fiscal.portaria}</option>
                ))}
              </select>
            </label>
            <Info label="Secretaria / órgão" value={selectedFiscal?.organ || '-'} />
            <Info label="Portaria" value={selectedFiscal?.portaria || '-'} />
          </div>
          {fiscais.length === 0 && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">Nenhum fiscal cadastrado. Cadastre primeiro na aba Cadastrar Fiscais / Portarias.</p>}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
          <SectionTitle number="3" title="Dados da fiscalização" desc="Informe o período avaliado neste relatório." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Período da fiscalização - de</span>
              <input type="date" value={inspectionStartDate} onChange={(event) => setInspectionStartDate(event.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Período da fiscalização - a</span>
              <input type="date" value={inspectionEndDate} onChange={(event) => setInspectionEndDate(event.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </label>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SectionTitle number="3.1" title="Informações gerais do contrato" />
            <div className="space-y-2">
              {GENERAL_CHECK_ITEMS.map((item) => (
                <ChecklistFormItem
                  key={item.key}
                  section="3.1"
                  item={item}
                  value={generalChecks[item.key]}
                  observation={checklistObservations[checklistItemId('3.1', item.key)] || ''}
                  onCheckChange={updateGeneralCheck}
                  onObservationChange={updateChecklistObservation}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SectionTitle number="3.2" title="Execução do objeto" />
            <div className="space-y-2">
              {OBJECT_EXECUTION_CHECK_ITEMS.map((item) => (
                <ChecklistFormItem
                  key={item.key}
                  section="3.2"
                  item={item}
                  value={objectExecutionChecks[item.key]}
                  observation={checklistObservations[checklistItemId('3.2', item.key)] || ''}
                  onCheckChange={updateObjectExecutionCheck}
                  onObservationChange={updateChecklistObservation}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SectionTitle number="3.3" title="Pagamentos de notas fiscais" />
            <div className="space-y-2">
              {INVOICE_PAYMENT_CHECK_ITEMS.map((item) => (
                <ChecklistFormItem
                  key={item.key}
                  section="3.3"
                  item={item}
                  value={invoicePaymentChecks[item.key]}
                  observation={checklistObservations[checklistItemId('3.3', item.key)] || ''}
                  onCheckChange={updateInvoicePaymentCheck}
                  onObservationChange={updateChecklistObservation}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SectionTitle number="3.4" title={"Gestão documental e registros"} />
            <div className="space-y-2">
              {DOCUMENT_MANAGEMENT_CHECK_ITEMS.map((item) => (
                <ChecklistFormItem
                  key={item.key}
                  section="3.4"
                  item={item}
                  value={documentManagementChecks[item.key]}
                  observation={checklistObservations[checklistItemId('3.4', item.key)] || ''}
                  onCheckChange={updateDocumentManagementCheck}
                  onObservationChange={updateChecklistObservation}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SectionTitle number="3.5" title={"Avaliação geral do período"} />
            <div className="space-y-2">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div>
                  <span className="text-[10px] font-medium text-emerald-700">Cumprimento do objeto</span>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">Avaliação do cumprimento do objeto no período</p>
                </div>
                <ChoiceSelector
                  value={periodEvaluation.objectFulfillment}
                  options={[
                    { value: 'total', label: 'Total' },
                    { value: 'parcial', label: 'Parcial' },
                    { value: 'insatisfatorio', label: 'Insatisfatório' }
                  ]}
                  onChange={(value) => updatePeriodEvaluation('objectFulfillment', value)}
                />
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div>
                  <span className="text-[10px] font-medium text-emerald-700">Desempenho da contratada</span>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">Classificação do desempenho apresentado</p>
                </div>
                <ChoiceSelector
                  value={periodEvaluation.contractorPerformance}
                  options={[
                    { value: 'otimo', label: 'Ótimo' },
                    { value: 'bom', label: 'Bom' },
                    { value: 'regular', label: 'Regular' },
                    { value: 'ruim', label: 'Ruim' }
                  ]}
                  onChange={(value) => updatePeriodEvaluation('contractorPerformance', value)}
                />
              </div>
              <label className="block p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] font-medium text-emerald-700">Recomendações / ações corretivas</span>
                <textarea
                  value={periodEvaluation.correctiveActions}
                  onChange={(event) => updatePeriodEvaluation('correctiveActions', event.target.value)}
                  rows={12}
                  placeholder="Digite livremente as recomendações, providências ou ações corretivas necessárias. Este campo não possui limite de caracteres."
                  className="mt-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y"
                />
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div>
                  <span className="text-[10px] font-medium text-emerald-700">Necessidade de aditivo contratual</span>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">Indique se há necessidade de formalizar aditivo</p>
                </div>
                <ChoiceSelector
                  value={periodEvaluation.contractualAdditiveNeeded}
                  options={[
                    { value: 'sim', label: 'Sim' },
                    { value: 'nao', label: 'Não' }
                  ]}
                  onChange={(value) => {
                    updatePeriodEvaluation('contractualAdditiveNeeded', value);
                    if (value !== 'sim') setSelectedAmendmentId('');
                  }}
                  className="sm:w-36"
                />
              </div>
              {periodEvaluation.contractualAdditiveNeeded === 'sim' && (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <label className="space-y-1.5 block">
                    <span className="text-[10px] font-medium text-emerald-700">Aditivo vinculado ao contrato</span>
                    <select
                      value={selectedAmendmentId}
                      onChange={(event) => setSelectedAmendmentId(event.target.value)}
                      disabled={!selectedContract || selectedContractAmendments.length === 0}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">{selectedContract ? 'Selecione o aditivo' : 'Selecione um contrato primeiro'}</option>
                      {selectedContractAmendments.map((amendment) => (
                        <option key={amendment.id} value={amendment.id}>
                          {amendment.amendmentNum} - {amendment.type} - {amendment.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedContract && selectedContractAmendments.length === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">Nenhum termo aditivo cadastrado para este contrato.</p>
                  )}
                  {selectedAmendment && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Info label="Aditivo" value={selectedAmendment.amendmentNum} />
                      <Info label="Tipo" value={selectedAmendment.type} />
                      <Info label="Status" value={selectedAmendment.status} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-slate-800">Notas fiscais puxadas do contrato</h2>
              <p className="text-xs text-slate-500 mt-0.5">{selectedNotes.length} nota(s) vinculada(s)</p>
            </div>
            <span className="text-xs font-medium text-emerald-700">{money(selectedNotesTotal)}</span>
          </div>
          {notesTable(selectedNotes)}
        </section>
      </div>
    );
  }

  if (mode === 'view' && selectedReport) {
    const checks = selectedReport.generalChecks || DEFAULT_CHECKS;
    const executionChecks = selectedReport.objectExecutionChecks || OBJECT_EXECUTION_DEFAULT_CHECKS;
    const paymentChecks = selectedReport.invoicePaymentChecks || INVOICE_PAYMENT_DEFAULT_CHECKS;
    const documentChecks = selectedReport.documentManagementChecks || DOCUMENT_MANAGEMENT_DEFAULT_CHECKS;
    const evaluation = selectedReport.periodEvaluation || PERIOD_EVALUATION_DEFAULT;
    const recommendationsText = evaluation.correctiveActions.trim() || 'Não informado';
    const printGeneralItems = GENERAL_CHECK_ITEMS.map((item) => ({ number: item.number, label: item.label, answer: answerLabel(checks[item.key]) }));
    const printExecutionItems = OBJECT_EXECUTION_CHECK_ITEMS.map((item) => ({ number: item.number, label: item.label, answer: answerLabel(executionChecks[item.key]) }));
    const printPaymentItems = INVOICE_PAYMENT_CHECK_ITEMS.map((item) => ({ number: item.number, label: item.label, answer: answerLabel(paymentChecks[item.key]) }));
    const printDocumentItems = DOCUMENT_MANAGEMENT_CHECK_ITEMS.map((item) => ({ number: item.number, label: item.label, answer: answerLabel(documentChecks[item.key]) }));
    return (
      <>
      <div className="space-y-6 print:hidden">
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button onClick={() => setMode('list')} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
            <h1 className="text-xl font-medium text-slate-900">Relatório de Fiscalização de Contratos</h1>
            <p className="text-xs text-slate-500 mt-1">Criado em {selectedReport.createdAt}</p>
          </div>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-colors cursor-pointer">
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <SectionTitle number="1" title="Dados do contrato" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Info label="Nº do contrato" value={selectedReport.contractNum} />
            <Info label="Vigência" value={selectedReport.validity} />
            <Info label="Ordem de fornecimento" value={selectedReport.supplyOrder} />
            <Info label="Total das notas" value={money(selectedReport.notesTotal)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Objeto do contrato</span>
              <div className="min-h-24 px-3 py-2 text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl">{selectedReport.contractObject}</div>
            </div>
            <Info label="Contratado" value={`${selectedReport.contractor} - CPF/CNPJ: ${selectedReport.contractorDocument}`} />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <SectionTitle number="2" title="Dados do fiscal" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Info label="Fiscal" value={selectedReport.fiscalName} />
            <Info label="Secretaria / órgão" value={selectedReport.fiscalOrgan} />
            <Info label="Portaria" value={selectedReport.fiscalPortaria} />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <SectionTitle number="3" title="Dados da fiscalização" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Info label="Período de" value={selectedReport.inspectionStartDate || '-'} />
            <Info label="Período a" value={selectedReport.inspectionEndDate || '-'} />
          </div>
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SectionTitle number="3.1" title="Informações gerais do contrato" />
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {GENERAL_CHECK_ITEMS.map((item) => {
                const observation = observationFor('3.1', item.key, checks[item.key]);
                return (
                  <div key={item.key} className="p-3 bg-white flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-medium text-emerald-700">Item {item.number}</span>
                        <p className="text-xs font-medium text-slate-800 mt-0.5">{item.label}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium shrink-0">{answerLabel(checks[item.key])}</span>
                    </div>
                    {observation && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        <span className="font-medium text-slate-500">Observações: </span>{observation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SectionTitle number="3.2" title="Execução do objeto" />
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {OBJECT_EXECUTION_CHECK_ITEMS.map((item) => {
                const observation = observationFor('3.2', item.key, executionChecks[item.key]);
                return (
                  <div key={item.key} className="p-3 bg-white flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-medium text-emerald-700">Item {item.number}</span>
                        <p className="text-xs font-medium text-slate-800 mt-0.5">{item.label}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium shrink-0">{answerLabel(executionChecks[item.key])}</span>
                    </div>
                    {observation && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        <span className="font-medium text-slate-500">Observações: </span>{observation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SectionTitle number="3.3" title="Pagamentos de notas fiscais" />
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {INVOICE_PAYMENT_CHECK_ITEMS.map((item) => {
                const observation = observationFor('3.3', item.key, paymentChecks[item.key]);
                return (
                  <div key={item.key} className="p-3 bg-white flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-medium text-emerald-700">Item {item.number}</span>
                        <p className="text-xs font-medium text-slate-800 mt-0.5">{item.label}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium shrink-0">{answerLabel(paymentChecks[item.key])}</span>
                    </div>
                    {observation && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        <span className="font-medium text-slate-500">Observações: </span>{observation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SectionTitle number="3.4" title={"Gestão documental e registros"} />
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {DOCUMENT_MANAGEMENT_CHECK_ITEMS.map((item) => {
                const observation = observationFor('3.4', item.key, documentChecks[item.key]);
                return (
                  <div key={item.key} className="p-3 bg-white flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-medium text-emerald-700">Item {item.number}</span>
                        <p className="text-xs font-medium text-slate-800 mt-0.5">{item.label}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium shrink-0">{answerLabel(documentChecks[item.key])}</span>
                    </div>
                    {observation && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        <span className="font-medium text-slate-500">Observações: </span>{observation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SectionTitle number="3.5" title={"Avaliação geral do período"} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Info label="Cumprimento do objeto" value={objectFulfillmentLabel(evaluation.objectFulfillment)} />
              <Info label="Desempenho da contratada" value={contractorPerformanceLabel(evaluation.contractorPerformance)} />
              <Info label="Necessidade de aditivo contratual" value={additiveNeedLabel(evaluation.contractualAdditiveNeeded)} />
            </div>
            {evaluation.contractualAdditiveNeeded === 'sim' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Info label="Aditivo selecionado" value={selectedReport.selectedAmendment?.amendmentNum || 'Não selecionado'} />
                <Info label="Tipo do aditivo" value={selectedReport.selectedAmendment?.type || '-'} />
                <Info label="Status do aditivo" value={selectedReport.selectedAmendment?.status || '-'} />
              </div>
            )}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Recomendações / ações corretivas</span>
              <div className="min-h-24 px-3 py-2 text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl whitespace-pre-wrap">{evaluation.correctiveActions.trim() || 'Não informado'}</div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-slate-800">Notas fiscais</h2>
            <span className="text-xs font-medium text-emerald-700">{money(selectedReport.notesTotal)}</span>
          </div>
          {notesTable(selectedReportNotes)}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <SectionTitle number="4" title="Assinaturas" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
            <div className="space-y-5">
              <div className="border-t border-slate-400 pt-2 text-center">
                <p className="text-xs font-medium text-slate-900">{selectedReport.fiscalName}</p>
                <p className="text-[11px] text-slate-500">Fiscal do Contrato</p>
              </div>
              <div className="border-t border-slate-300 pt-2 text-center">
                <p className="text-xs font-medium text-slate-700">Data</p>
                <p className="text-[11px] text-slate-400">_____/_____/________</p>
              </div>
            </div>
            <div className="space-y-5">
              <div className="border-t border-slate-400 pt-2 text-center">
                <p className="text-xs font-medium text-slate-900">Gestor do Contrato</p>
                <p className="text-[11px] text-slate-500">Quando aplicável</p>
              </div>
              <div className="border-t border-slate-300 pt-2 text-center">
                <p className="text-xs font-medium text-slate-700">Data</p>
                <p className="text-[11px] text-slate-400">_____/_____/________</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="hidden print:block text-slate-950">
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
          <h1 className="text-base font-bold uppercase tracking-wide">Relatório de Fiscalização de Contratos</h1>
          <p className="text-[10px] mt-1">Secretaria de Saúde - Sistema Integrado de Gestão de Contratos</p>
          <p className="text-[10px]">Emitido em {today()} - Relatório criado em {selectedReport.createdAt}</p>
        </div>

        <div className="space-y-3">
          <div className="break-inside-avoid">
            <h2 className="mb-1.5 text-xs font-bold uppercase">1. Dados do contrato</h2>
            <PrintInfoTable rows={[
              ['Nº do contrato', selectedReport.contractNum],
              ['Vigência', selectedReport.validity],
              ['Ordem de fornecimento', selectedReport.supplyOrder],
              ['Contratado', selectedReport.contractor],
              ['CPF/CNPJ', selectedReport.contractorDocument],
              ['Total das notas fiscais', money(selectedReport.notesTotal)],
              ['Objeto do contrato', selectedReport.contractObject]
            ]} />
          </div>

          <div className="break-inside-avoid">
            <h2 className="mb-1.5 text-xs font-bold uppercase">2. Dados do fiscal</h2>
            <PrintInfoTable rows={[
              ['Fiscal do contrato', selectedReport.fiscalName],
              ['Secretaria / órgão', selectedReport.fiscalOrgan],
              ['Portaria', selectedReport.fiscalPortaria]
            ]} />
          </div>

          <div className="break-inside-avoid">
            <h2 className="mb-1.5 text-xs font-bold uppercase">3. Dados da fiscalização</h2>
            <PrintInfoTable rows={[
              ['Período de', selectedReport.inspectionStartDate || '-'],
              ['Período a', selectedReport.inspectionEndDate || '-']
            ]} />
          </div>

          <PrintChecklistTable title="3.1 Informações gerais do contrato" items={printGeneralItems} />
          <PrintChecklistTable title="3.2 Execução do objeto" items={printExecutionItems} />
          <PrintChecklistTable title="3.3 Pagamentos de notas fiscais" items={printPaymentItems} />
          <PrintChecklistTable title="3.4 Gestão documental e registros" items={printDocumentItems} />

          <div className="break-inside-avoid">
            <h2 className="mb-1.5 text-xs font-bold uppercase">3.5 Avaliação geral do período</h2>
            <PrintInfoTable rows={[
              ['Cumprimento do objeto', objectFulfillmentLabel(evaluation.objectFulfillment)],
              ['Desempenho da contratada', contractorPerformanceLabel(evaluation.contractorPerformance)],
              ['Necessidade de aditivo contratual', additiveNeedLabel(evaluation.contractualAdditiveNeeded)],
              ['Aditivo selecionado', evaluation.contractualAdditiveNeeded === 'sim' ? selectedReport.selectedAmendment?.amendmentNum || 'Não selecionado' : '-'],
              ['Tipo do aditivo', evaluation.contractualAdditiveNeeded === 'sim' ? selectedReport.selectedAmendment?.type || '-' : '-'],
              ['Status do aditivo', evaluation.contractualAdditiveNeeded === 'sim' ? selectedReport.selectedAmendment?.status || '-' : '-']
            ]} />
          </div>

          <div className="print-page-break-before">
            <h2 className="mb-2 text-xs font-bold uppercase">Recomendações e ações corretivas</h2>
            <div className="min-h-[900px] whitespace-pre-wrap border border-slate-400 p-3 text-[11px] leading-relaxed">{recommendationsText}</div>
          </div>

          <div className="print-page-break-before">
            <h2 className="mb-1.5 text-xs font-bold uppercase">Notas fiscais vinculadas</h2>
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="border border-slate-400 px-1.5 py-1 text-left">Nota fiscal</th>
                  <th className="border border-slate-400 px-1.5 py-1 text-left">Emissão</th>
                  <th className="border border-slate-400 px-1.5 py-1 text-left">Atesto</th>
                  <th className="border border-slate-400 px-1.5 py-1 text-left">Status</th>
                  <th className="border border-slate-400 px-1.5 py-1 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {selectedReportNotes.map((note) => (
                  <tr key={note.id}>
                    <td className="border border-slate-400 px-1.5 py-1">{note.noteNumber}</td>
                    <td className="border border-slate-400 px-1.5 py-1">{note.issueDate || '-'}</td>
                    <td className="border border-slate-400 px-1.5 py-1">{note.attestationDate || '-'}</td>
                    <td className="border border-slate-400 px-1.5 py-1">{note.status}</td>
                    <td className="border border-slate-400 px-1.5 py-1 text-right">{money(note.value)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-slate-400 px-1.5 py-1 text-right font-bold" colSpan={4}>Total</td>
                  <td className="border border-slate-400 px-1.5 py-1 text-right font-bold">{money(selectedReport.notesTotal)}</td>
                </tr>
              </tbody>
            </table>

            <h2 className="mt-10 mb-8 text-xs font-bold uppercase">4. Assinaturas</h2>
            <div className="grid grid-cols-2 gap-12 text-center text-[11px]">
              <div>
                <div className="border-t border-slate-900 pt-2">
                  <p className="font-semibold">{selectedReport.fiscalName}</p>
                  <p>Fiscal do Contrato</p>
                </div>
                <div className="mt-8 border-t border-slate-500 pt-2">Data: _____/_____/________</div>
              </div>
              <div>
                <div className="border-t border-slate-900 pt-2">
                  <p className="font-semibold">Gestor do Contrato</p>
                  <p>Quando aplicável</p>
                </div>
                <div className="mt-8 border-t border-slate-500 pt-2">Data: _____/_____/________</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-slate-900">Relatório de Fiscalização de Contratos</h1>
          <p className="text-xs text-slate-500 mt-1">Relatórios criados a partir dos contratos e notas fiscais.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Criar relatório</span>
        </button>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-slate-800">Relatórios criados</span>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar contrato, contratado ou ordem..." className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Criado em</th>
                <th className="py-3 px-4">Contrato</th>
                <th className="py-3 px-4">Contratado</th>
                <th className="py-3 px-4">Fiscal</th>
                <th className="py-3 px-4 text-right">Notas</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Nenhum relatório criado</p>
                    <p className="text-xs text-slate-400 mt-1">Clique em Criar relatório para iniciar.</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-600">{report.createdAt}</td>
                    <td className="py-3 px-4">
                      <span className="block font-mono font-medium text-slate-900">{report.contractNum}</span>
                      <span className="block text-[11px] text-slate-500">Ordem: {report.supplyOrder}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="block font-medium text-slate-800">{report.contractor}</span>
                      <span className="block text-[11px] text-slate-500">{report.contractorDocument}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {report.fiscalName}
                      <span className="block text-[11px] text-slate-500">Portaria {report.fiscalPortaria}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="block font-medium text-slate-900">{report.noteIds.length}</span>
                      <span className="block text-[11px] text-emerald-700">{money(report.notesTotal)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => { setSelectedReportId(report.id); setMode('view'); }} className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer" title="Ver relatório">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setReports((current) => current.filter((item) => item.id !== report.id))} className="p-2 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer" title="Excluir relatório">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
