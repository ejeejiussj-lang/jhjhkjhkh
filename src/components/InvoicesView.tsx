import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, Plus, FileText, CheckCircle2, Clock, Link2, Link2Off, Eye, Info, HelpCircle, X, Search, Building2, Landmark, Filter } from 'lucide-react';
import { ServiceNote, Contract, Creditor, Commitment } from '../types';

const BUDGET_ALLOCATIONS = ['06.01', '06.06'];

interface InvoicesViewProps {
  notes: ServiceNote[];
  contracts: Contract[];
  commitments: Commitment[];
  creditors?: Creditor[];
  onAddNote: (note: ServiceNote) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  notes,
  contracts = [],
  commitments = [],
  creditors = [],
  onAddNote
}) => {
  const [showModal, setShowModal] = useState(false);
  const [noteNumber, setNoteNumber] = useState('');
  const [contractNum, setContractNum] = useState('');
  const [creditor, setCreditor] = useState('');
  const [value, setValue] = useState('');
  const [budgetAllocation, setBudgetAllocation] = useState('06.01');
  const [commitmentId, setCommitmentId] = useState('');

  // Search & Filter state for notes table
  const [searchTerm, setSearchTerm] = useState('');
  const [contractFilter, setContractFilter] = useState('ALL');
  const [creditorFilter, setCreditorFilter] = useState('ALL');

  // List of registered creditors/companies
  const registeredCompanies = useMemo(() => {
    const list: { id: string; name: string; cnpj?: string }[] = [];
    const seenNames = new Set<string>();

    // First add from creditors list
    creditors.forEach((c) => {
      if (c.name && !seenNames.has(c.name)) {
        seenNames.add(c.name);
        list.push({ id: c.id, name: c.name, cnpj: c.cnpj });
      }
    });

    // Also add any creditor names present in contracts if not already included
    contracts.forEach((c) => {
      if (c.creditor && !seenNames.has(c.creditor)) {
        seenNames.add(c.creditor);
        list.push({ id: `contract-cred-${c.id}`, name: c.creditor, cnpj: c.cnpj });
      }
    });

    return list;
  }, [creditors, contracts]);

  const allCompanyNames = useMemo(() => {
    return registeredCompanies.map((c) => c.name).sort();
  }, [registeredCompanies]);

  const availableCommitments = useMemo(() => {
    return commitments.filter((commitment) => commitment.budgetAllocation === budgetAllocation);
  }, [commitments, budgetAllocation]);

  const selectedCommitment = commitments.find((commitment) => commitment.id === commitmentId);

  // Reset form to empty values when modal opens
  useEffect(() => {
    if (showModal) {
      setNoteNumber('');
      setContractNum('');
      setCreditor('');
      setValue('');
      setBudgetAllocation('06.01');
      setCommitmentId('');
    }
  }, [showModal]);

  const handleContractChange = (selectedContractNum: string) => {
    setContractNum(selectedContractNum);
    const matched = contracts.find((c) => c.contractNum === selectedContractNum);
    if (matched && matched.creditor) {
      setCreditor(matched.creditor);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const noteValue = parseFloat(value) || 0;
    const parsedCommitmentValue = selectedCommitment?.value || 0;
    const parsedCommitmentBalance = selectedCommitment?.currentBalance ?? selectedCommitment?.balance ?? 0;
    const currentBalance = parsedCommitmentBalance - noteValue;

    onAddNote({
      id: `n-${Date.now()}`,
      noteNumber,
      contractNum: contractNum || 'Contrato Não Selecionado',
      creditor: creditor || 'Credor Não Identificado',
      issueDate: new Date().toLocaleDateString('pt-BR'),
      value: noteValue,
      status: 'Pendente',
      budgetAllocation,
      program: selectedCommitment?.program || '',
      commitmentNumber: selectedCommitment?.number || '',
      commitmentValue: parsedCommitmentValue,
      commitmentBalance: parsedCommitmentBalance,
      currentBalance,
      commitmentId
    });

    setShowModal(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleBudgetAllocationChange = (allocation: string) => {
    setBudgetAllocation(allocation);
    setCommitmentId('');
  };

  const previewCurrentBalance = (selectedCommitment?.currentBalance ?? selectedCommitment?.balance ?? 0) - (parseFloat(value) || 0);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        n.noteNumber.toLowerCase().includes(term) ||
        n.contractNum.toLowerCase().includes(term) ||
        n.creditor.toLowerCase().includes(term) ||
        (n.budgetAllocation || '').toLowerCase().includes(term) ||
        (n.program || '').toLowerCase().includes(term) ||
        (n.commitmentNumber || '').toLowerCase().includes(term);

      const matchesContract = contractFilter === 'ALL' || n.contractNum === contractFilter;
      const matchesCreditor = creditorFilter === 'ALL' || n.creditor === creditorFilter;

      return matchesSearch && matchesContract && matchesCreditor;
    });
  }, [notes, searchTerm, contractFilter, creditorFilter]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notas de Serviço</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lançamento, liquidação e acompanhamento de notas de serviço, vinculação a contratos e empresas.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Lançar Nota de Serviço</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nota, Contrato ou Empresa..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Contract Filter */}
          <div className="flex items-center space-x-1.5 text-xs bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl">
            <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Todos os Contratos</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.contractNum}>
                  {c.contractNum}
                </option>
              ))}
              <option value="SEM VÍNCULO">Sem Vínculo (Avulsas)</option>
            </select>
          </div>

          {/* Creditor/Company Filter */}
          <div className="flex items-center space-x-1.5 text-xs bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={creditorFilter}
              onChange={(e) => setCreditorFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Todas as Empresas / Credores</option>
              {allCompanyNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Número da Nota</th>
                <th className="py-3 px-4">Contrato Vinculado</th>
                <th className="py-3 px-4">Vínculo de Sistema</th>
                <th className="py-3 px-4">Credor / Empresa</th>
                <th className="py-3 px-4">Data Emissão</th>
                <th className="py-3 px-4">Dotação</th>
                <th className="py-3 px-4">Programa</th>
                <th className="py-3 px-4">Empenho</th>
                <th className="py-3 px-4">Valor Líquido</th>
                <th className="py-3 px-4">Saldo Atual</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-400 italic">
                    Nenhuma nota fiscal encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredNotes.map((n) => {
                  const isLinked = contracts.some(
                    (c) => c.contractNum.toLowerCase().trim() === n.contractNum.toLowerCase().trim()
                  );

                  return (
                    <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Note Number */}
                      <td className="py-3.5 px-4 font-bold text-purple-700 whitespace-nowrap">
                        <span className="flex items-center space-x-1.5">
                          <Receipt className="w-3.5 h-3.5 text-purple-500" />
                          <span>{n.noteNumber}</span>
                        </span>
                      </td>

                      {/* Contract Num */}
                      <td className="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">
                        {n.contractNum}
                      </td>

                      {/* Vínculo Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isLinked ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <Link2 className="w-3 h-3" />
                            <span>VINCULADA</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <Link2Off className="w-3 h-3" />
                            <span>SEM CONTRATO</span>
                          </span>
                        )}
                      </td>

                      {/* Creditor */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {n.creditor}
                      </td>

                      {/* Issue Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {n.issueDate}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">
                        {n.budgetAllocation || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 min-w-64">
                        <p className="line-clamp-2" title={n.program || ''}>
                          {n.program || '-'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">{n.commitmentNumber || '-'}</p>
                          <p className="text-[10px] text-slate-500">
                            Empenho: {formatCurrency(n.commitmentValue || 0)}
                          </p>
                        </div>
                      </td>

                      {/* Value */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(n.value)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5 text-right">
                          <p className="text-[10px] text-slate-500">
                            Antes: {formatCurrency(n.commitmentBalance || 0)}
                          </p>
                          <p className={`font-bold ${(n.currentBalance || 0) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {formatCurrency(n.currentBalance || 0)}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            n.status === 'Paga'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : n.status === 'Pendente'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}
                        >
                          {n.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Launch Note Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-full max-w-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Lançar Nota de Serviço</h3>
                <p className="text-[11px] text-slate-500">Selecione o contrato e a empresa credora responsável</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              {/* Note Number input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número da Nota Fiscal (NF) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={noteNumber}
                  onChange={(e) => setNoteNumber(e.target.value)}
                  placeholder="Ex: NF-203443 ou 10452"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none font-bold text-slate-800"
                />
              </div>

              {/* Linked Contract Select Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selecionar Contrato Cadastrado <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={contractNum}
                  onChange={(e) => handleContractChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="">-- Selecione o Contrato Cadastrado --</option>
                  {contracts && contracts.length > 0 ? (
                    contracts.map((c) => (
                      <option key={c.id} value={c.contractNum}>
                        {c.contractNum} - {c.creditor} ({c.category})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Nenhum contrato cadastrado no sistema</option>
                  )}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Exibe apenas os contratos cadastrados no sistema.
                </p>
              </div>

              {/* Creditor / Company Select Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selecionar Empresa / Credor Cadastrado <span className="text-rose-500">*</span>
                </label>

                <select
                  required
                  value={creditor}
                  onChange={(e) => setCreditor(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="">-- Selecione a Empresa / Credor Cadastrado --</option>
                  {registeredCompanies.length > 0 ? (
                    registeredCompanies.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} {c.cnpj ? `- CNPJ: ${c.cnpj}` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Nenhuma empresa cadastrada no sistema</option>
                  )}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Exibe apenas as empresas e credores cadastrados.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dotação <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={budgetAllocation}
                    onChange={(e) => handleBudgetAllocationChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none font-bold text-slate-800 cursor-pointer"
                  >
                    {BUDGET_ALLOCATIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Empenho <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={commitmentId}
                    onChange={(e) => setCommitmentId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Selecione o empenho --</option>
                    {availableCommitments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.number} - saldo {formatCurrency(item.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCommitment ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-3">
                    <span className="block text-[10px] font-bold uppercase text-emerald-700">Programa</span>
                    <span className="font-bold text-slate-900">{selectedCommitment.program}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-emerald-700">Valor do empenho</span>
                    <span className="font-bold text-slate-900">{formatCurrency(selectedCommitment.value)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-emerald-700">Saldo antes da nota</span>
                    <span className="font-bold text-slate-900">{formatCurrency(selectedCommitment.currentBalance)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-emerald-700">Saldo após desconto</span>
                    <span className={`font-bold ${previewCurrentBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatCurrency(previewCurrentBalance)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-semibold">
                  Selecione um empenho cadastrado para puxar programa, valor e saldo automaticamente.
                </div>
              )}

              {/* Value input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor da Nota (R$) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Desconto da nota</span>
                  <span className="font-bold text-slate-900">{formatCurrency(parseFloat(value) || 0)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Saldo atual</span>
                  <span className={`font-bold ${previewCurrentBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {formatCurrency(previewCurrentBalance)}
                  </span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

