import React, { useState } from 'react';
import { FileText, Printer, Download, Calendar, Filter, Search, Building2, Receipt, ArrowUpDown } from 'lucide-react';
import { Contract, ServiceNote } from '../types';

interface ReportsViewProps {
  contracts: Contract[];
  notes: ServiceNote[];
  onNavigateTab: (tab: any) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  contracts,
  notes,
  onNavigateTab
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedSecretaria, setSelectedSecretaria] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  // Map notes with corresponding contract info (secretaria/category)
  const enrichedNotes = notes.map((note) => {
    const contract = contracts.find(
      (c) => c.contractNum.toLowerCase().trim() === note.contractNum.toLowerCase().trim()
    );
    return {
      ...note,
      contractObj: contract,
      secretaria: contract?.category || 'Secretaria Municipal de Saúde'
    };
  });

  // Filter notes
  const filteredNotes = enrichedNotes.filter((note) => {
    const d = parseBRDate(note.issueDate);
    const monthMatch = selectedMonth === 'all' || (d && d.getMonth() + 1 === selectedMonth);
    const secretariaMatch =
      selectedSecretaria === 'all' || note.secretaria.toLowerCase() === selectedSecretaria.toLowerCase();
    const searchMatch =
      !searchTerm ||
      note.noteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.creditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.contractNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.secretaria.toLowerCase().includes(searchTerm.toLowerCase());

    return monthMatch && secretariaMatch && searchMatch;
  });

  const totalFilteredValue = filteredNotes.reduce((acc, curr) => acc + curr.value, 0);

  const handlePrintReport = () => {
    window.print();
  };

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Relatório Mensal de Notas de Serviço</h2>
          <p className="text-xs text-slate-500 mt-1">
            Consolidação mensal detalhada por número da nota, data, credor e secretaria ou fundo municipal de saúde.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrintReport}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Filtros e Busca do Relatório */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Filtro de Mês */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-700">Mês:</span>
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

            {/* Filtro de Secretaria / Fundo */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-bold text-slate-700">Órgão:</span>
              <select
                value={selectedSecretaria}
                onChange={(e) => setSelectedSecretaria(e.target.value)}
                className="bg-transparent text-slate-900 text-xs font-bold outline-none cursor-pointer max-w-[220px] truncate"
              >
                <option value="all">Secretaria & Fundo (Todos)</option>
                <option value="Secretaria Municipal de Saúde">Secretaria Municipal de Saúde</option>
                <option value="Fundo Municipal de Saúde">Fundo Municipal de Saúde</option>
              </select>
            </div>
          </div>

          {/* Busca */}
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

        {/* Resumo Rápido da Filtragem */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-3 text-slate-500 font-medium">
            <span>Notas encontradas: <strong className="text-slate-900">{filteredNotes.length}</strong></span>
            <span>•</span>
            <span>Valor Total Consolidado: <strong className="text-emerald-700">R$ {totalFilteredValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {selectedMonth === 'all' ? 'Exibindo todo o período' : `Mês selecionado: ${monthsList.find(m => m.value === selectedMonth)?.label}`}
          </span>
        </div>
      </div>

      {/* Tabela de Notas de Serviço do Relatório */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Demonstrativo Analítico de Notas de Serviço</h3>
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'Registro' : 'Registros'}
          </span>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">Nenhuma nota de serviço encontrada</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Não há notas fiscais/serviço cadastradas para os filtros selecionados (mês, secretaria ou termo de busca).
            </p>
            <button
              onClick={() => { setSelectedMonth('all'); setSelectedSecretaria('all'); setSearchTerm(''); }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-block"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/60 text-[10px]">
                  <th className="py-3 px-4">Nº da Nota</th>
                  <th className="py-3 px-4">Data de Emissão</th>
                  <th className="py-3 px-4">Credor / Empresa</th>
                  <th className="py-3 px-4">Contrato</th>
                  <th className="py-3 px-4">Secretaria / Fundo</th>
                  <th className="py-3 px-4 text-right">Valor (R$)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-extrabold text-slate-900 font-mono">
                      {note.noteNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {note.issueDate}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {note.creditor}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">
                      {note.contractNum}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        note.secretaria.toLowerCase().includes('fundo')
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {note.secretaria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                      R$ {note.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        note.status === 'Paga'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                        {note.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumo Adicional por Órgão */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Resumo por Secretaria Municipal de Saúde</span>
          </h4>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Total Notas (SMS)</span>
            <span className="font-extrabold text-slate-900">
              R$ {enrichedNotes.filter(n => n.secretaria.toLowerCase().includes('secretaria')).reduce((sum, n) => sum + n.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Resumo por Fundo Municipal de Saúde</span>
          </h4>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Total Notas (FMS)</span>
            <span className="font-extrabold text-slate-900">
              R$ {enrichedNotes.filter(n => n.secretaria.toLowerCase().includes('fundo')).reduce((sum, n) => sum + n.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


