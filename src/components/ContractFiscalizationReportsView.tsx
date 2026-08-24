import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, FileText, Plus, Printer, Receipt, Save, Search, Trash2 } from 'lucide-react';
import { Contract, Creditor, FiscalPortaria, ServiceNote } from '../types';

interface Props {
  contracts: Contract[];
  notes: ServiceNote[];
  creditors: Creditor[];
  fiscais: FiscalPortaria[];
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
  noteIds: string[];
  notesTotal: number;
}

const STORAGE_KEY = 'fiscalpro_contract_fiscalization_reports';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Date().toLocaleDateString('pt-BR');
const norm = (value = '') =>
  value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
    <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
    <p className="text-xs font-medium text-slate-900 mt-1">{value}</p>
  </div>
);

export const ContractFiscalizationReportsView: React.FC<Props> = ({ contracts, notes, creditors, fiscais }) => {
  const [reports, setReports] = useState<FiscalizationReport[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [mode, setMode] = useState<'list' | 'create' | 'view'>('list');
  const [selectedContractNum, setSelectedContractNum] = useState(contracts[0]?.contractNum || '');
  const [supplyOrder, setSupplyOrder] = useState('');
  const [selectedFiscalId, setSelectedFiscalId] = useState(fiscais[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    if (!selectedContractNum && contracts[0]) setSelectedContractNum(contracts[0].contractNum);
  }, [contracts, selectedContractNum]);

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
    () => notes.filter((note) => norm(note.contractNum) === norm(selectedContractNum)).sort((a, b) => a.noteNumber.localeCompare(b.noteNumber, 'pt-BR', { numeric: true })),
    [notes, selectedContractNum]
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
    return reports.filter((report) => [report.contractNum, report.contractor, report.contractorDocument, report.supplyOrder, report.fiscalName, report.fiscalPortaria].some((value) => norm(value).includes(term)));
  }, [reports, searchTerm]);

  const openCreate = () => {
    setMode('create');
    setSelectedReportId(null);
    setSupplyOrder('');
    setSelectedFiscalId(fiscais[0]?.id || '');
    setSelectedContractNum(contracts[0]?.contractNum || '');
  };

  const saveReport = () => {
    if (!selectedContract) return;
    const report: FiscalizationReport = {
      id: crypto.randomUUID(),
      createdAt: today(),
      contractNum: selectedContract.contractNum,
      contractObject: selectedContract.object,
      validity: `${selectedContract.startDate || '-'} a ${selectedContract.endDate || '-'}`,
      supplyOrder: supplyOrder.trim() || 'Nao informada',
      contractor: selectedContract.creditor,
      contractorDocument: selectedCreditor?.cnpj || 'Nao informado',
      fiscalName: selectedFiscal?.name || 'Fiscal nao selecionado',
      fiscalOrgan: selectedFiscal?.organ || 'Secretaria de Saude',
      fiscalPortaria: selectedFiscal?.portaria || 'Pendente',
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
          <tr><th className="py-3 px-4">Nota fiscal</th><th className="py-3 px-4">Emissao</th><th className="py-3 px-4">Atesto</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Valor</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.length === 0 ? <tr><td colSpan={5} className="py-8 px-4 text-center text-slate-400">Nenhuma nota fiscal encontrada para este contrato.</td></tr> : items.map((note) => (
            <tr key={note.id} className="hover:bg-slate-50/80"><td className="py-3 px-4 font-medium text-slate-900">{note.noteNumber}</td><td className="py-3 px-4 text-slate-600">{note.issueDate || '-'}</td><td className="py-3 px-4 text-slate-600">{note.attestationDate || '-'}</td><td className="py-3 px-4 text-slate-600">{note.status}</td><td className="py-3 px-4 text-right font-medium text-slate-900">{money(note.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (mode === 'create') {
    return <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><button onClick={() => setMode('list')} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" /><span>Voltar</span></button><h1 className="text-xl font-medium text-slate-900">Criar Relatorio de Fiscalizacao</h1><p className="text-xs text-slate-500 mt-1">Dados do contrato e notas fiscais vinculadas sao preenchidos automaticamente.</p></div><button onClick={saveReport} disabled={!selectedContract} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"><Save className="w-4 h-4" /><span>Salvar relatorio</span></button></div>
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5"><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><label className="space-y-1.5"><span className="text-xs font-medium text-slate-700">Contrato</span><select value={selectedContractNum} onChange={(event) => setSelectedContractNum(event.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">{contracts.map((contract) => <option key={contract.id} value={contract.contractNum}>{contract.contractNum} - {contract.creditor}</option>)}</select></label><label className="space-y-1.5"><span className="text-xs font-medium text-slate-700">Ordem de fornecimento</span><input value={supplyOrder} onChange={(event) => setSupplyOrder(event.target.value)} placeholder="Preencher manualmente" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" /></label></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"><Info label="N do contrato" value={selectedContract?.contractNum || '-'} /><Info label="Vigencia" value={selectedContract ? `${selectedContract.startDate} a ${selectedContract.endDate}` : '-'} /><Info label="Contratado" value={selectedContract?.creditor || '-'} /><Info label="CPF/CNPJ" value={selectedCreditor?.cnpj || 'Nao informado'} /></div><div className="space-y-1.5"><span className="text-xs font-medium text-slate-700">Objeto do contrato</span><div className="min-h-20 px-3 py-2 text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl">{selectedContract?.object || '-'}</div></div></section>
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4"><h2 className="text-sm font-medium text-slate-800">Dados do fiscal</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><label className="space-y-1.5"><span className="text-xs font-medium text-slate-700">Fiscal cadastrado</span><select value={selectedFiscalId} onChange={(event) => setSelectedFiscalId(event.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"><option value="">Selecione o fiscal</option>{fiscais.map((fiscal) => <option key={fiscal.id} value={fiscal.id}>{fiscal.name} - {fiscal.portaria}</option>)}</select></label><Info label="Secretaria / orgao" value={selectedFiscal?.organ || '-'} /><Info label="Portaria" value={selectedFiscal?.portaria || '-'} /></div>{fiscais.length === 0 && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">Nenhum fiscal cadastrado. Cadastre primeiro na aba Cadastrar Fiscais / Portarias.</p>}</section>
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-medium text-slate-800">Notas fiscais puxadas do contrato</h2><p className="text-xs text-slate-500 mt-0.5">{selectedNotes.length} nota(s) vinculada(s)</p></div><span className="text-xs font-medium text-emerald-700">{money(selectedNotesTotal)}</span></div>{notesTable(selectedNotes)}</section>
    </div>;
  }

  if (mode === 'view' && selectedReport) {
    return <div className="space-y-6"><div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><button onClick={() => setMode('list')} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" /><span>Voltar</span></button><h1 className="text-xl font-medium text-slate-900">Relatorio de Fiscalizacao de Contratos</h1><p className="text-xs text-slate-500 mt-1">Criado em {selectedReport.createdAt}</p></div><button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"><Printer className="w-4 h-4" /><span>Imprimir / PDF</span></button></div><section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"><Info label="N do contrato" value={selectedReport.contractNum} /><Info label="Vigencia" value={selectedReport.validity} /><Info label="Ordem de fornecimento" value={selectedReport.supplyOrder} /><Info label="Total das notas" value={money(selectedReport.notesTotal)} /></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div className="space-y-1.5"><span className="text-xs font-medium text-slate-700">Objeto do contrato</span><div className="min-h-24 px-3 py-2 text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl">{selectedReport.contractObject}</div></div><div className="space-y-3"><Info label="Contratado" value={`${selectedReport.contractor} - CPF/CNPJ: ${selectedReport.contractorDocument}`} /><Info label="Fiscalizacao" value={`${selectedReport.fiscalName} - ${selectedReport.fiscalOrgan} - Portaria ${selectedReport.fiscalPortaria}`} /></div></div></section><section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium text-slate-800">Notas fiscais</h2><span className="text-xs font-medium text-emerald-700">{money(selectedReport.notesTotal)}</span></div>{notesTable(selectedReportNotes)}</section></div>;
  }

  return <div className="space-y-6"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-xl font-medium text-slate-900">Relatorio de Fiscalizacao de Contratos</h1><p className="text-xs text-slate-500 mt-1">Relatorios criados a partir dos contratos e notas fiscais.</p></div><button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer self-start sm:self-auto"><Plus className="w-4 h-4" /><span>Criar relatorio</span></button></div><section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"><div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600" /><span className="text-sm font-medium text-slate-800">Relatorios criados</span></div><div className="relative w-full md:w-80"><Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar contrato, contratado ou ordem..." className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" /></div></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="py-3 px-4">Criado em</th><th className="py-3 px-4">Contrato</th><th className="py-3 px-4">Contratado</th><th className="py-3 px-4">Fiscal</th><th className="py-3 px-4 text-right">Notas</th><th className="py-3 px-4 text-right">Acoes</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredReports.length === 0 ? <tr><td colSpan={6} className="py-12 px-4 text-center"><div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3"><Receipt className="w-6 h-6" /></div><p className="text-sm font-medium text-slate-700">Nenhum relatorio criado</p><p className="text-xs text-slate-400 mt-1">Clique em Criar relatorio para iniciar.</p></td></tr> : filteredReports.map((report) => <tr key={report.id} className="hover:bg-slate-50/80"><td className="py-3 px-4 text-slate-600">{report.createdAt}</td><td className="py-3 px-4"><span className="block font-mono font-medium text-slate-900">{report.contractNum}</span><span className="block text-[11px] text-slate-500">Ordem: {report.supplyOrder}</span></td><td className="py-3 px-4"><span className="block font-medium text-slate-800">{report.contractor}</span><span className="block text-[11px] text-slate-500">{report.contractorDocument}</span></td><td className="py-3 px-4 text-slate-700">{report.fiscalName}<span className="block text-[11px] text-slate-500">Portaria {report.fiscalPortaria}</span></td><td className="py-3 px-4 text-right"><span className="block font-medium text-slate-900">{report.noteIds.length}</span><span className="block text-[11px] text-emerald-700">{money(report.notesTotal)}</span></td><td className="py-3 px-4"><div className="flex justify-end gap-1.5"><button onClick={() => { setSelectedReportId(report.id); setMode('view'); }} className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer" title="Ver relatorio"><Eye className="w-4 h-4" /></button><button onClick={() => setReports((current) => current.filter((item) => item.id !== report.id))} className="p-2 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer" title="Excluir relatorio"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div></section></div>;
};
