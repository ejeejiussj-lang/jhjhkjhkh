import React, { useMemo, useState } from 'react';
import { Bot, CheckCircle2, Loader2, Send, Sparkles, Wand2 } from 'lucide-react';
import { Commitment, Contract, Creditor, ServiceNote } from '../types';
import { PROGRAMS_BY_ALLOCATION } from './CommitmentsView';

type ChatRole = 'assistant' | 'user';

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

type AiAction =
  | {
      type: 'create_contract';
      contractNum: string;
      creditor: string;
      object: string;
      startDate?: string;
      endDate?: string;
      totalValue?: number;
      category?: string;
    }
  | {
      type: 'create_commitment';
      number: string;
      budgetAllocation: string;
      program: string;
      value: number;
      balance?: number;
      description?: string;
    }
  | {
      type: 'create_note';
      noteNumber: string;
      contractNum?: string;
      creditor?: string;
      value: number;
      commitmentNumber?: string;
      budgetAllocation?: string;
    }
  | {
      type: 'create_creditor';
      name: string;
      cnpj?: string;
      category?: string;
    };

interface AiResponse {
  reply: string;
  actions?: AiAction[];
}

interface AiAssistantViewProps {
  contracts: Contract[];
  creditors: Creditor[];
  commitments: Commitment[];
  onAddContract: (contract: Omit<Contract, 'id'>) => void;
  onAddCommitment: (commitment: Omit<Commitment, 'id' | 'currentBalance' | 'balance'>) => void;
  onAddNote: (note: ServiceNote) => void;
  onAddCreditor: (creditor: Creditor) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const parseJsonResponse = (text: string): AiResponse => {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonText = firstBrace >= 0 && lastBrace >= 0 ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

  try {
    return JSON.parse(jsonText);
  } catch {
    return { reply: cleaned || 'Consegui analisar, mas nao consegui montar uma acao automatica.' };
  }
};

const normalize = (value: string) => value.toLowerCase().trim();

const parseNumber = (value?: string) => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return Number(cleaned) || 0;
};

const findValueNear = (text: string, labels: string[]) => {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}[^\\d]*(\\d[\\d.,]*)`, 'i'));
    if (match?.[1]) return parseNumber(match[1]);
  }
  const currency = text.match(/R\$\s*([\d.,]+)/i);
  return currency?.[1] ? parseNumber(currency[1]) : 0;
};

const findTextAfter = (text: string, labels: string[]) => {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n;]+)`, 'i'));
    if (match?.[1]) return match[1].trim();
  }
  return '';
};

const detectProgram = (text: string, budgetAllocation: string) => {
  const upperText = text.toUpperCase();
  const programs = PROGRAMS_BY_ALLOCATION[budgetAllocation] || [];
  return (
    programs.find((program) => upperText.includes(program.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase())) ||
    programs.find((program) => upperText.includes(program.toUpperCase())) ||
    programs[0] ||
    ''
  );
};

const createLocalResponse = (prompt: string): AiResponse => {
  const contractNum = prompt.match(/(?:contrato|ct)\s*(?:n[ºo.]*)?\s*[:\-]?\s*([A-Za-z0-9./-]+)/i)?.[1] || '';
  const commitmentNumber = prompt.match(/(?:empenho|ne)\s*(?:n[ºo.]*)?\s*[:\-]?\s*([A-Za-z0-9./-]+)/i)?.[1] || '';
  const noteNumber = prompt.match(/(?:nota fiscal|nota|nf)\s*(?:n[ºo.]*)?\s*[:\-]?\s*([A-Za-z0-9./-]+)/i)?.[1] || '';
  const budgetAllocation = prompt.match(/\b06\.(?:01|06)\b/)?.[0] || '';
  const creditor = findTextAfter(prompt, ['credor', 'empresa', 'contratada', 'fornecedor']);
  const object = findTextAfter(prompt, ['objeto', 'descricao', 'descrição']);
  const totalValue = findValueNear(prompt, ['valor do contrato', 'valor global', 'valor total']);
  const commitmentValue = findValueNear(prompt, ['valor do empenho', 'empenho valor', 'valor empenho']);
  const commitmentBalance = findValueNear(prompt, ['saldo atual', 'saldo do empenho', 'saldo']);
  const noteValue = findValueNear(prompt, ['valor da nota', 'nota valor', 'valor liquido', 'valor líquido']);
  const actions: AiAction[] = [];
  const lower = prompt.toLowerCase();

  if ((lower.includes('credor') || lower.includes('empresa')) && creditor) {
    actions.push({
      type: 'create_creditor',
      name: creditor,
      cnpj: prompt.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/)?.[0] || ''
    });
  }

  if (contractNum && creditor && object && (lower.includes('contrato') || lower.includes('cadastre'))) {
    actions.push({
      type: 'create_contract',
      contractNum,
      creditor,
      object,
      totalValue,
      category: 'Secretaria Municipal de Saude'
    });
  }

  if (commitmentNumber && budgetAllocation && (commitmentValue || commitmentBalance)) {
    actions.push({
      type: 'create_commitment',
      number: commitmentNumber,
      budgetAllocation,
      program: detectProgram(prompt, budgetAllocation),
      value: commitmentValue || commitmentBalance,
      balance: commitmentBalance || commitmentValue,
      description: 'Identificado automaticamente pelo chat'
    });
  }

  if (noteNumber && noteValue) {
    actions.push({
      type: 'create_note',
      noteNumber,
      contractNum,
      creditor,
      value: noteValue,
      commitmentNumber,
      budgetAllocation
    });
  }

  if (actions.length === 0) {
    return {
      reply:
        'Consegui ler a mensagem, mas faltam dados para cadastrar. Envie numero de contrato ou empenho, credor, objeto, dotacao e valor.'
    };
  }

  return {
    reply: 'Identifiquei os dados principais e executei o cadastro automatico disponivel.',
    actions
  };
};

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  contracts,
  creditors,
  commitments,
  onAddContract,
  onAddCommitment,
  onAddNote,
  onAddCreditor
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        'Ola! Sou a IA do painel. Cole aqui um texto de contrato, empenho ou nota fiscal que eu identifico objeto, numero, credor, dotacao, programa, valores e ja cadastro quando tiver dados suficientes.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastActions, setLastActions] = useState<string[]>([]);

  const systemContext = useMemo(() => {
    const compactContracts = contracts.slice(0, 80).map((item) => ({
      numero: item.contractNum,
      credor: item.creditor,
      objeto: item.object,
      valor: item.totalValue,
      status: item.status
    }));

    const compactCommitments = commitments.slice(0, 80).map((item) => ({
      id: item.id,
      numero: item.number,
      dotacao: item.budgetAllocation,
      programa: item.program,
      valor: item.value,
      saldoAtual: item.currentBalance
    }));

    const compactCreditors = creditors.slice(0, 80).map((item) => ({
      nome: item.name,
      cnpj: item.cnpj,
      categoria: item.category
    }));

    return JSON.stringify({
      hoje: new Date().toLocaleDateString('pt-BR'),
      contratos: compactContracts,
      empenhos: compactCommitments,
      credores: compactCreditors,
      dotacoes: {
        '06.01': PROGRAMS_BY_ALLOCATION['06.01'],
        '06.06': PROGRAMS_BY_ALLOCATION['06.06']
      }
    });
  }, [contracts, creditors, commitments]);

  const executeActions = (actions: AiAction[] = []) => {
    const executed: string[] = [];

    actions.forEach((action) => {
      if (action.type === 'create_creditor' && action.name) {
        const alreadyExists = creditors.some((item) => normalize(item.name) === normalize(action.name));
        if (!alreadyExists) {
          onAddCreditor({
            id: `cred-ai-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: action.name,
            cnpj: action.cnpj || '',
            category: action.category || 'Saude',
            activeContractsCount: 0,
            totalValue: 0,
            status: 'Ativo'
          });
          executed.push(`Credor cadastrado: ${action.name}`);
        }
      }

      if (action.type === 'create_contract' && action.contractNum && action.creditor && action.object) {
        const alreadyExists = contracts.some((item) => normalize(item.contractNum) === normalize(action.contractNum));
        if (!alreadyExists) {
          onAddContract({
            contractNum: action.contractNum,
            creditor: action.creditor,
            object: action.object,
            startDate: action.startDate || '',
            endDate: action.endDate || '',
            totalValue: Number(action.totalValue) || 0,
            usedValue: 0,
            status: 'Ativo',
            category: action.category || 'Secretaria Municipal de Saude',
            fiscalName: '',
            fiscalPortaria: '',
            fiscalPortariaPublicationDate: '',
            fiscalPortariaValidity: '',
            items: []
          });
          executed.push(`Contrato cadastrado: ${action.contractNum}`);
        }
      }

      if (action.type === 'create_commitment' && action.number && action.budgetAllocation && action.program) {
        const alreadyExists = commitments.some((item) => normalize(item.number) === normalize(action.number));
        if (!alreadyExists) {
          const value = Number(action.value) || 0;
          onAddCommitment({
            number: action.number,
            budgetAllocation: action.budgetAllocation,
            program: action.program,
            value,
            description: action.description || 'Cadastrado pela IA'
          });
          executed.push(`Empenho cadastrado: ${action.number}`);
        }
      }

      if (action.type === 'create_note' && action.noteNumber && action.value) {
        const alreadyExists = false;
        const selectedCommitment =
          commitments.find((item) => normalize(item.number) === normalize(action.commitmentNumber || '')) ||
          commitments.find((item) => item.budgetAllocation === action.budgetAllocation);
        const selectedContract = contracts.find((item) => normalize(item.contractNum) === normalize(action.contractNum || ''));
        const noteValue = Number(action.value) || 0;
        const commitmentBalance = selectedCommitment?.currentBalance ?? selectedCommitment?.balance ?? 0;

        if (!alreadyExists) {
          onAddNote({
            id: `n-ai-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            noteNumber: action.noteNumber,
            contractNum: action.contractNum || selectedContract?.contractNum || 'Contrato Nao Selecionado',
            creditor: action.creditor || selectedContract?.creditor || 'Credor Nao Identificado',
            issueDate: new Date().toLocaleDateString('pt-BR'),
            value: noteValue,
            status: 'Pendente',
            budgetAllocation: selectedCommitment?.budgetAllocation || action.budgetAllocation || '',
            program: selectedCommitment?.program || '',
            commitmentNumber: selectedCommitment?.number || action.commitmentNumber || '',
            commitmentValue: selectedCommitment?.value || 0,
            commitmentBalance,
            currentBalance: commitmentBalance - noteValue,
            commitmentId: selectedCommitment?.id || ''
          });
          executed.push(`Nota cadastrada: ${action.noteNumber} (${formatCurrency(noteValue)})`);
        }
      }
    });

    setLastActions(executed);
    return executed;
  };

  const sendMessage = async () => {
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setLastActions([]);

    try {
      const response = await fetch('/api/openrouter-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemContext })
      });

      if (!response.ok) {
        const fallback = createLocalResponse(prompt);
        const executed = executeActions(fallback.actions || []);
        const executedText = executed.length ? `\n\nAcoes executadas:\n${executed.map((item) => `- ${item}`).join('\n')}` : '';

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: `${fallback.reply}\n\nOpenRouter nao respondeu agora, usei leitura rapida local.${executedText}`
          }
        ]);
        return;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const aiResponse = parseJsonResponse(text);
      const executed = executeActions(aiResponse.actions || []);
      const executedText = executed.length ? `\n\nAcoes executadas:\n${executed.map((item) => `- ${item}`).join('\n')}` : '';

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `${aiResponse.reply || 'Pronto.'}${executedText}`
        }
      ]);
    } catch (error) {
      console.error(error);
      const fallback = createLocalResponse(prompt);
      const executed = executeActions(fallback.actions || []);
      const executedText = executed.length ? `\n\nAcoes executadas:\n${executed.map((item) => `- ${item}`).join('\n')}` : '';

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `${fallback.reply}\n\nNao consegui falar com o OpenRouter agora, usei leitura rapida local.${executedText}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] min-h-[640px] grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">IA FiscalPro</h1>
              <p className="text-xs text-slate-500">Contratos, notas, empenhos, objetos e cadastros automaticos.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>OpenRouter</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-xs'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Analisando e preparando cadastro...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
              placeholder="Digite ou cole dados: contrato 012/2026, objeto, empenho, dotacao, valor da nota..."
              className="flex-1 resize-none px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="w-12 h-12 self-end inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Enviar"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <aside className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-emerald-600" />
            <span>O que ela faz</span>
          </h2>
          <div className="mt-3 space-y-2 text-xs text-slate-600">
            <p>Identifica objeto, numero de contrato, credor, empenho, dotacao, programa e valores.</p>
            <p>Cadastra contrato, empenho, credor e nota quando os dados estiverem completos.</p>
            <p>Ao lancar nota, desconta do saldo do empenho pelo fluxo normal do sistema.</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-xs font-bold uppercase text-slate-400">Base carregada</h3>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
              <p className="text-lg font-bold text-slate-900">{contracts.length}</p>
              <p className="text-[10px] text-slate-500">Contratos</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
              <p className="text-lg font-bold text-slate-900">{commitments.length}</p>
              <p className="text-[10px] text-slate-500">Empenhos</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
              <p className="text-lg font-bold text-slate-900">{creditors.length}</p>
              <p className="text-[10px] text-slate-500">Credores</p>
            </div>
          </div>
        </div>

        {lastActions.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase text-slate-400">Ultimas acoes</h3>
            <div className="mt-3 space-y-2">
              {lastActions.map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
