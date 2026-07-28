import React, { useState } from 'react';
import { FilePlus, Check, ArrowLeft, RotateCcw, UserCheck, ShieldCheck, FileCheck, Landmark, Users, Plus, Tag } from 'lucide-react';
import { Contract, ContractStatus, FiscalPortaria, Creditor } from '../types';
import { saveContractToSupabase } from '../lib/supabaseService';


interface NewContractViewProps {
  fiscais?: FiscalPortaria[];
  creditors?: Creditor[];
  categories?: string[];
  onAddCategory?: (category: string) => void;
  onAddContract: (contract: Omit<Contract, 'id'>) => void;
  onCancel: () => void;
}

export const NewContractView: React.FC<NewContractViewProps> = ({
  fiscais = [],
  creditors = [],
  categories = [],
  onAddCategory,
  onAddContract,
  onCancel
}) => {
  const [contractNum, setContractNum] = useState('');
  const [creditor, setCreditor] = useState('');
  const [object, setObject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [status, setStatus] = useState<ContractStatus>('Ativo');
  const [category, setCategory] = useState('Secretaria Municipal de Saúde');

  // Fiscal and Portaria fields
  const [selectedFiscalId, setSelectedFiscalId] = useState('');
  const [fiscalName, setFiscalName] = useState('');
  const [fiscalPortaria, setFiscalPortaria] = useState('');
  const [fiscalPortariaPublicationDate, setFiscalPortariaPublicationDate] = useState('');
  const [fiscalPortariaValidity, setFiscalPortariaValidity] = useState('');

  const [successMessage, setSuccessMessage] = useState(false);

  const defaultCategories = [
    'Secretaria Municipal de Saúde',
    'Fundo Municipal de Saúde'
  ];

  const categoryOptions = defaultCategories;

  const handleSelectCreditor = (creditorName: string) => {
    if (!creditorName) return;
    setCreditor(creditorName);
  };

  const handleSelectFiscal = (fiscalId: string) => {
    setSelectedFiscalId(fiscalId);
    const found = fiscais.find((f) => f.id === fiscalId);
    if (found) {
      setFiscalName(found.name);
      setFiscalPortaria(found.portaria);
      setFiscalPortariaPublicationDate(found.publicationDate);
      setFiscalPortariaValidity(found.validity);
    } else {
      setFiscalName('');
      setFiscalPortaria('');
      setFiscalPortariaPublicationDate('');
      setFiscalPortariaValidity('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractNum || !creditor || !object) return;

    const newContractData = {
      contractNum,
      creditor,
      object,
      startDate,
      endDate,
      totalValue: parseFloat(totalValue) || 0,
      usedValue: 0,
      status,
      category,
      fiscalName,
      fiscalPortaria,
      fiscalPortariaPublicationDate,
      fiscalPortariaValidity
    };

    onAddContract(newContractData);

    // Save asynchronously to Supabase
    saveContractToSupabase({
      id: `ct-${Date.now()}`,
      ...newContractData
    });

    setSuccessMessage(true);
    setTimeout(() => {
      setSuccessMessage(false);
      onCancel();
    }, 1500);
  };


  const handleReset = () => {
    setContractNum('');
    setCreditor('');
    setObject('');
    setStartDate('');
    setEndDate('');
    setTotalValue('');
    setStatus('Ativo');
    setCategory('Secretaria de Saúde');
    setSelectedFiscalId('');
    setFiscalName('');
    setFiscalPortaria('');
    setFiscalPortariaPublicationDate('');
    setFiscalPortariaValidity('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn pb-12">
      {/* Header with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onCancel}
            className="group flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar ao Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Lançar Novo Contrato</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Preencha os dados do contrato, vigência, valores e os dados da portaria do fiscal responsável.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-600 text-white p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn shadow-xs">
          <Check className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>Contrato cadastrado com sucesso! Redirecionando...</span>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">Formulário de Lançamento de Contrato</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-7">

          {/* SECTION 1: Identificação do Instrumento */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Landmark className="w-4 h-4 text-emerald-600" />
                <span>1. Órgão e Empresa / Credor Contratado</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Número do Contrato <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contractNum}
                  onChange={(e) => setContractNum(e.target.value)}
                  placeholder="Ex: CT-2025-0012 ou 012/2025"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Órgão Responsável / Categoria Contratante <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 font-semibold cursor-pointer"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700">
                Empresa / Credor Contratado <span className="text-rose-500">*</span>
              </label>

              {creditors.length > 0 ? (
                <select
                  required
                  value={creditor}
                  onChange={(e) => handleSelectCreditor(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-900 cursor-pointer"
                >
                  <option value="">-- Selecione a Empresa / Credor Cadastrado --</option>
                  {creditors.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.tradeName ? `(${c.tradeName})` : ''} - CNPJ: {c.cnpj}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  Nenhum credor/empresa cadastrado no sistema. Cadastre a empresa na aba <strong>Credores</strong> primeiro.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Objeto do Contrato <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={object}
                onChange={(e) => setObject(e.target.value)}
                placeholder="Descreva detalhadamente o objeto, serviços contratados ou fornecimento de materiais..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed text-slate-800"
              />
            </div>
          </div>

          {/* SECTION 2: Vigência e Valor */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>2. Vigência e Valor Global do Contrato</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Vigência - Data Início <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Ex: 01/08/2025"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Vigência - Data Término <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Ex: 31/07/2026"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Valor Total do Contrato (R$) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                  placeholder="Ex: 150000"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status Inicial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ContractStatus)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="A Vencer">A Vencer</option>
                  <option value="Suspenso">Suspenso</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: Dados do Fiscal e Portaria */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>3. Fiscalização do Contrato & Portaria</span>
              </div>
            </div>

            {fiscais.length > 0 ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Fiscal do Contrato Cadastrado <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedFiscalId}
                  onChange={(e) => handleSelectFiscal(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-900 cursor-pointer"
                >
                  <option value="">-- Selecione o Fiscal Cadastrado na aba Fiscais & Portarias --</option>
                  {fiscais.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.portaria}) - {f.organ || 'Saúde'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Nenhum fiscal cadastrado no sistema. Cadastre o fiscal e a portaria na aba <strong>Fiscais & Portarias</strong> primeiro.
              </div>
            )}

            {fiscalName && (
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Fiscal Designado</span>
                  <span className="font-bold text-slate-900">{fiscalName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Portaria nº</span>
                  <span className="font-bold text-slate-900">{fiscalPortaria || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Data Publicação</span>
                  <span className="font-bold text-slate-900">{fiscalPortariaPublicationDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Vigência Portaria</span>
                  <span className="font-bold text-slate-900">{fiscalPortariaValidity || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Form Action Buttons */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center space-x-1 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Campos</span>
            </button>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar e Gravar Contrato</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

