import React, { useMemo, useState } from 'react';
import { Banknote, Plus, Search, Trash2, X, Check } from 'lucide-react';
import { Commitment } from '../types';

export const BUDGET_ALLOCATIONS = ['06.01', '06.06'];

export const PROGRAMS_BY_ALLOCATION: Record<string, string[]> = {
  '06.01': [
    'MANUTENÇÃO DO BLOCO DE MÉDIA E ALTA COMPLEXIDADE AMBULATORIAL E HOSPITALAR',
    'ATENÇÃO BÁSICA',
    'MANUTENÇÃO DO BLOCO DE VIGILÂNCIA EM SAÚDE'
  ],
  '06.06': [
    'SECRETARIA DE SAÚDE',
    'CASA DE APOIO SECRETARIA DE SAÚDE'
  ]
};

interface CommitmentsViewProps {
  commitments: Commitment[];
  onAddCommitment: (commitment: Omit<Commitment, 'id' | 'currentBalance' | 'balance'>) => void;
  onDeleteCommitment: (id: string) => void;
}

export const CommitmentsView: React.FC<CommitmentsViewProps> = ({
  commitments,
  onAddCommitment,
  onDeleteCommitment
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [number, setNumber] = useState('');
  const [budgetAllocation, setBudgetAllocation] = useState('06.01');
  const [program, setProgram] = useState(PROGRAMS_BY_ALLOCATION['06.01'][0]);
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const availablePrograms = PROGRAMS_BY_ALLOCATION[budgetAllocation] || [];

  const handleBudgetChange = (allocation: string) => {
    setBudgetAllocation(allocation);
    setProgram(PROGRAMS_BY_ALLOCATION[allocation]?.[0] || '');
  };

  const resetForm = () => {
    setNumber('');
    setBudgetAllocation('06.01');
    setProgram(PROGRAMS_BY_ALLOCATION['06.01'][0]);
    setValue('');
    setDescription('');
  };

  const handleOpen = () => {
    resetForm();
    setShowModal(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const commitmentValue = parseFloat(value) || 0;

    onAddCommitment({
      number,
      budgetAllocation,
      program,
      value: commitmentValue,
      description
    });
    setShowModal(false);
  };

  const filteredCommitments = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return commitments.filter((commitment) =>
      commitment.number.toLowerCase().includes(term) ||
      commitment.budgetAllocation.toLowerCase().includes(term) ||
      commitment.program.toLowerCase().includes(term) ||
      (commitment.description || '').toLowerCase().includes(term)
    );
  }, [commitments, searchTerm]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Banknote className="w-7 h-7 text-emerald-600" />
            <span>Empenhos</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre os empenhos por dotação e programa. A nota fiscal apenas seleciona o empenho correspondente.
          </p>
        </div>

        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Empenho</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número, dotação ou programa..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Total: <span className="font-bold text-slate-900">{filteredCommitments.length}</span> empenhos
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                <th className="py-3.5 px-4">Número</th>
                <th className="py-3.5 px-4">Dotação</th>
                <th className="py-3.5 px-4">Programa</th>
                <th className="py-3.5 px-4 text-right">Valor do Empenho</th>
                <th className="py-3.5 px-4 text-right">Saldo Atual</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommitments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Banknote className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-xs">Nenhum empenho cadastrado.</p>
                  </td>
                </tr>
              ) : (
                filteredCommitments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.number}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">{item.budgetAllocation}</td>
                    <td className="py-3.5 px-4 text-slate-700 min-w-72">
                      <p className="line-clamp-2" title={item.program}>{item.program}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      {formatCurrency(item.value)}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold ${item.currentBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatCurrency(item.currentBalance)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onDeleteCommitment(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Empenho"
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Cadastrar Empenho</h3>
                <p className="text-[11px] text-slate-500">Informe dotacao, programa e valor. O saldo atual sera calculado automaticamente.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dotação <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={budgetAllocation}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  >
                    {BUDGET_ALLOCATIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número do Empenho <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Ex: 000123"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Programa <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                >
                  {availablePrograms.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor do Empenho (R$) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  O saldo atual inicia igual ao valor do empenho e diminui quando uma nota fiscal for vinculada.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observação</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional do empenho"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Empenho</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
