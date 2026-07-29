import React, { useMemo, useState } from 'react';
import { Printer, Calendar, Search, Building2, Receipt } from 'lucide-react';
import { Contract, ServiceNote } from '../types';

interface ReportsViewProps {
  contracts: Contract[];
  notes: ServiceNote[];
  onNavigateTab: (tab: any) => void;
}

type EnrichedNote = ServiceNote & {
  contractObj?: Contract;
  secretaria: string;
  competencyDate: Date | null;
  competencyKey: string;
  competencyLabel: string;
};

const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

const parseBRDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);
  const date = new Date(year, month, day);

  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const getCompetencyDate = (note: ServiceNote) => parseBRDate(note.attestationDate) || parseBRDate(note.issueDate);

const getCompetencyKey = (date: Date | null) => {
  if (!date) return 'sem-data';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getCompetencyLabel = (date: Date | null) => {
  if (!date) return 'Sem competência';
  return `${monthNames[date.getMonth()]} / ${date.getFullYear()}`;
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

export const ReportsView: React.FC<ReportsViewProps> = ({
  contracts,
  notes
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedSecretaria, setSelectedSecretaria] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const enrichedNotes = useMemo<EnrichedNote[]>(() => {
    return notes.map((note) => {
      const contract = contracts.find(
        (c) => c.contractNum.toLowerCase().trim() === note.contractNum.toLowerCase().trim()
      );
      const competencyDate = getCompetencyDate(note);

      return {
        ...note,
        contractObj: contract,
        secretaria: contract?.category || 'Secretaria Municipal de Saúde',
        competencyDate,
        competencyKey: getCompetencyKey(competencyDate),
        competencyLabel: getCompetencyLabel(competencyDate)
      };
    });
  }, [contracts, notes]);

  const realMonthsList = useMemo(() => {
    const unique = new Map<string, { value: string; label: string; time: number }>();

    enrichedNotes.forEach((note) => {
      if (!unique.has(note.competencyKey)) {
        unique.set(note.competencyKey, {
          value: note.competencyKey,
          label: note.competencyLabel,
          time: note.competencyDate?.getTime() ?? Number.MAX_SAFE_INTEGER
        });
      }
    });

    return [...unique.values()].sort((a, b) => a.time - b.time);
  }, [enrichedNotes]);

  const filteredNotes = useMemo(() => {
    return enrichedNotes
      .filter((note) => {
        const monthMatch = selectedMonth === 'all' || note.competencyKey === selectedMonth;
        const secretariaMatch =
          selectedSecretaria === 'all' || note.secretaria.toLowerCase() === selectedSecretaria.toLowerCase();
        const term = searchTerm.toLowerCase().trim();
        const searchMatch =
          !term ||
          note.noteNumber.toLowerCase().includes(term) ||
          note.creditor.toLowerCase().includes(term) ||
          note.contractNum.toLowerCase().includes(term) ||
          note.secretaria.toLowerCase().includes(term);

        return monthMatch && secretariaMatch && searchMatch;
      })
      .sort((a, b) => {
        const aDate = a.competencyDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDate = b.competencyDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (aDate !== bDate) return aDate - bDate;
        return a.noteNumber.localeCompare(b.noteNumber, 'pt-BR', { numeric: true });
      });
  }, [enrichedNotes, searchTerm, selectedMonth, selectedSecretaria]);

  const groupedNotes = useMemo(() => {
    const groups = new Map<string, { label: string; notes: EnrichedNote[]; total: number; time: number }>();

    filteredNotes.forEach((note) => {
      if (!groups.has(note.competencyKey)) {
        groups.set(note.competencyKey, {
          label: note.competencyLabel,
          notes: [],
          total: 0,
          time: note.competencyDate?.getTime() ?? Number.MAX_SAFE_INTEGER
        });
      }

      const group = groups.get(note.competencyKey)!;
      group.notes.push(note);
      group.total += note.value;
    });

    return [...groups.values()].sort((a, b) => a.time - b.time);
  }, [filteredNotes]);

  const totalFilteredValue = filteredNotes.reduce((acc, curr) => acc + curr.value, 0);
  const selectedMonthLabel =
    selectedMonth === 'all'
      ? 'Todos os meses'
      : realMonthsList.find((m) => m.value === selectedMonth)?.label || 'Mês selecionado';

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-slate-800">Relatório Mensal de Notas de Serviço</h2>
          <p className="text-xs text-slate-500 mt-1">
            Consolidação mensal por competência real, nota, contrato, empresa e secretaria ou fundo municipal de saúde.
          </p>
        </div>
        <button
          onClick={handlePrintReport}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>Imprimir / PDF</span>
        </button>
      </div>

      <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-medium text-slate-700">Mês:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-900 text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">Todos os Meses</option>
                {realMonthsList.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-medium text-slate-700">Órgão:</span>
              <select
                value={selectedSecretaria}
                onChange={(e) => setSelectedSecretaria(e.target.value)}
                className="bg-transparent text-slate-900 text-xs font-medium outline-none cursor-pointer max-w-[220px] truncate"
              >
                <option value="all">Secretaria & Fundo (Todos)</option>
                <option value="Secretaria Municipal de Saúde">Secretaria Municipal de Saúde</option>
                <option value="Fundo Municipal de Saúde">Fundo Municipal de Saúde</option>
              </select>
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nota, credor ou contrato..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-3 text-slate-500 font-medium">
            <span>Notas encontradas: <strong className="text-slate-900">{filteredNotes.length}</strong></span>
            <span>•</span>
            <span>Valor Total Consolidado: <strong className="text-emerald-700">{formatCurrency(totalFilteredValue)}</strong></span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            {selectedMonth === 'all' ? 'Exibindo todo o período' : `Mês selecionado: ${selectedMonthLabel}`}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-medium text-slate-800">Demonstrativo Analítico de Notas de Serviço</h3>
          </div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'Registro' : 'Registros'}
          </span>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-700">Nenhuma nota de serviço encontrada</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Não há notas fiscais/serviço cadastradas para os filtros selecionados.
            </p>
            <button
              onClick={() => { setSelectedMonth('all'); setSelectedSecretaria('all'); setSearchTerm(''); }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer inline-block"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedNotes.map((group) => (
              <div key={group.label}>
                <div className="px-6 py-3 bg-slate-50/80 flex items-center justify-between text-xs text-slate-700">
                  <span className="font-medium">{group.label}</span>
                  <span>{group.notes.length} nota(s) • {formatCurrency(group.total)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white text-slate-500 font-medium uppercase tracking-wider border-b border-slate-200/60 text-[10px]">
                        <th className="py-3 px-4">Nº da Nota</th>
                        <th className="py-3 px-4">Competência / Atesto</th>
                        <th className="py-3 px-4">Data de Emissão</th>
                        <th className="py-3 px-4">Credor / Empresa</th>
                        <th className="py-3 px-4">Contrato</th>
                        <th className="py-3 px-4">Secretaria / Fundo</th>
                        <th className="py-3 px-4 text-right">Valor</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.notes.map((note) => (
                        <tr key={note.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-900 font-mono">{note.noteNumber}</td>
                          <td className="py-3 px-4 font-medium text-slate-700">{note.attestationDate || '-'}</td>
                          <td className="py-3 px-4 font-medium text-slate-700">{note.issueDate || '-'}</td>
                          <td className="py-3 px-4 font-medium text-slate-800">{note.creditor}</td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-600">{note.contractNum || '-'}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {note.secretaria}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(note.value)}</td>
                          <td className="py-3 px-4 text-center text-slate-600">{note.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="print:hidden grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <h4 className="text-xs font-medium text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Resumo por Secretaria Municipal de Saúde</span>
          </h4>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Total Notas (SMS)</span>
            <span className="font-medium text-slate-900">
              {formatCurrency(filteredNotes.filter(n => n.secretaria.toLowerCase().includes('secretaria')).reduce((sum, n) => sum + n.value, 0))}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <h4 className="text-xs font-medium text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Resumo por Fundo Municipal de Saúde</span>
          </h4>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Total Notas (FMS)</span>
            <span className="font-medium text-slate-900">
              {formatCurrency(filteredNotes.filter(n => n.secretaria.toLowerCase().includes('fundo')).reduce((sum, n) => sum + n.value, 0))}
            </span>
          </div>
        </div>
      </div>

      <section className="hidden print:block text-slate-900">
        <div className="border-b border-slate-300 pb-4 mb-4">
          <h1 className="text-xl font-medium">Relatório Mensal de Notas de Serviço</h1>
          <p className="text-xs mt-1">Período: {selectedMonthLabel}</p>
          <p className="text-xs">Órgão: {selectedSecretaria === 'all' ? 'Secretaria & Fundo (Todos)' : selectedSecretaria}</p>
          <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
            <div className="border border-slate-300 rounded p-2">
              <span className="block text-slate-500">Notas</span>
              <span className="text-base font-medium">{filteredNotes.length}</span>
            </div>
            <div className="border border-slate-300 rounded p-2">
              <span className="block text-slate-500">Valor consolidado</span>
              <span className="text-base font-medium">{formatCurrency(totalFilteredValue)}</span>
            </div>
            <div className="border border-slate-300 rounded p-2">
              <span className="block text-slate-500">Meses no relatório</span>
              <span className="text-base font-medium">{groupedNotes.length}</span>
            </div>
          </div>
        </div>

        {groupedNotes.map((group) => (
          <div key={`print-${group.label}`} className="mb-6 break-inside-avoid">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-2">
              <h2 className="text-sm font-medium">{group.label}</h2>
              <span className="text-xs">{group.notes.length} nota(s) • Total {formatCurrency(group.total)}</span>
            </div>
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="border border-slate-300 p-1.5">Nº Nota</th>
                  <th className="border border-slate-300 p-1.5">Contrato</th>
                  <th className="border border-slate-300 p-1.5">Secretaria / Fundo</th>
                  <th className="border border-slate-300 p-1.5">Empresa</th>
                  <th className="border border-slate-300 p-1.5">Atesto</th>
                  <th className="border border-slate-300 p-1.5">Emissão</th>
                  <th className="border border-slate-300 p-1.5 text-right">Valor</th>
                  <th className="border border-slate-300 p-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {group.notes.map((note) => (
                  <tr key={`print-${note.id}`}>
                    <td className="border border-slate-300 p-1.5">{note.noteNumber}</td>
                    <td className="border border-slate-300 p-1.5">{note.contractNum || '-'}</td>
                    <td className="border border-slate-300 p-1.5">{note.secretaria}</td>
                    <td className="border border-slate-300 p-1.5">{note.creditor}</td>
                    <td className="border border-slate-300 p-1.5">{note.attestationDate || '-'}</td>
                    <td className="border border-slate-300 p-1.5">{note.issueDate || '-'}</td>
                    <td className="border border-slate-300 p-1.5 text-right">{formatCurrency(note.value)}</td>
                    <td className="border border-slate-300 p-1.5">{note.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
    </div>
  );
};
