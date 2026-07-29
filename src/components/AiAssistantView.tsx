import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CheckCircle2, FileText, Loader2, Paperclip, Send, Sparkles, Wand2, X } from 'lucide-react';
import { ActiveTab, Commitment, Contract, Creditor, ServiceNote } from '../types';
import { PROGRAMS_BY_ALLOCATION } from './CommitmentsView';
import { getSupabaseConfig } from '../lib/supabase';

type ChatRole = 'assistant' | 'user';

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

interface AttachedFile {
  id: string;
  filename: string;
  fileData: string;
  size: number;
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
    }
  | {
      type: 'create_alert';
      title: string;
      desc: string;
      linkTab?: ActiveTab;
    };

interface AiResponse {
  reply: string;
  actions?: AiAction[];
}

interface AiAssistantViewProps {
  contracts: Contract[];
  creditors: Creditor[];
  commitments: Commitment[];
  notes: ServiceNote[];
  onAddContract: (contract: Omit<Contract, 'id'>) => void;
  onAddCommitment: (commitment: Omit<Commitment, 'id' | 'currentBalance' | 'balance'>) => void;
  onAddNote: (note: ServiceNote) => void;
  onAddCreditor: (creditor: Creditor) => void;
  onAddAlert: (alert: { title: string; desc: string; linkTab?: ActiveTab }) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const fixMojibake = (value: string) => {
  const replacements: Record<string, string> = {
    'OlÃ¡': 'Olá',
    'VocÃª': 'Você',
    'tambÃ©m': 'também',
    'estÃ¡': 'está',
    'possÃ­veis': 'possíveis',
    'pendÃªncias': 'pendências',
    'atenÃ§Ã£o': 'atenção',
    'anÃ¡lise': 'análise',
    'nÃ£o': 'não',
    'aÃ§Ã£o': 'ação',
    'aÃ§Ãµes': 'ações',
    'AÃ§Ãµes': 'Ações',
    'automÃ¡tica': 'automática',
    'automÃ¡tico': 'automático',
    'disponÃ­vel': 'disponível',
    'nÃºmero': 'número',
    'descriÃ§Ã£o': 'descrição',
    'lÃ­quido': 'líquido',
    'informaÃ§Ãµes': 'informações',
    'rÃ¡pida': 'rápida',
    'NÃ£o': 'Não',
    'ConcluÃ­': 'Concluí',
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã£': 'ã',
    'Ãµ': 'õ',
    'Ã§': 'ç',
    'Ãª': 'ê'
  };

  return Object.entries(replacements).reduce((text, [from, to]) => text.replaceAll(from, to), value);
};

const cleanAiText = (value: string) =>
  fixMojibake(value || '')
    .replaceAll('Analisando PDFs, textos e preparando cadastro...', 'Preparando resposta...')
    .replaceAll('Analisando PDFs, textos e preparando cadastro', 'Preparando resposta')
    .replace(/(?:Preparando resposta\.{0,3}\s*){2,}/g, 'Preparando resposta...');

const parseJsonResponse = (text: string): AiResponse => {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replaceAll('Analisando PDFs, textos e preparando cadastro...', 'Preparando resposta...')
    .replaceAll('Analisando PDFs, textos e preparando cadastro', 'Preparando resposta')
    .trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonText = firstBrace >= 0 && lastBrace >= 0 ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

  try {
    const parsed = JSON.parse(jsonText);
    return {
      ...parsed,
      reply: cleanAiText(parsed.reply || '')
    };
  } catch {
    return { reply: cleanAiText(cleaned) || 'Consegui analisar, mas não consegui montar uma ação automática.' };
  }
};

const normalize = (value: string) => value.toLowerCase().trim();

const parseDate = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const parsed = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const parsed = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const daysUntil = (date?: string) => {
  const parsed = parseDate(date);
  if (!parsed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.ceil((parsed.getTime() - today.getTime()) / 86400000);
};

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
      category: 'Secretaria Municipal de Saúde'
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
        'Consegui ler a mensagem, mas faltam dados para cadastrar. Envie número de contrato ou empenho, credor, objeto, dotação e valor.'
    };
  }

  return {
    reply: 'Identifiquei os dados principais e executei o cadastro automático disponível.',
    actions
  };
};

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  contracts,
  creditors,
  commitments,
  notes,
  onAddContract,
  onAddCommitment,
  onAddNote,
  onAddCreditor,
  onAddAlert
}) => {
  const emittedAlertKeysRef = useRef<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_ai_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((message) => ({
            ...message,
            text: cleanAiText(String(message.text || ''))
          }));
        }
      }
    } catch (error) {
      console.error(error);
    }

    return [
      {
        id: 'welcome',
        role: 'assistant',
        text:
          'Olá! Sou a IA do FiscalPro. Vou analisar o sistema para verificar contratos, notas, empenhos, saldos, vencimentos e possíveis pendências nos processos. Se encontrar algo faltando, eu informo com objetividade e gero alertas; se estiver tudo certo, aviso que a base está em ordem. Você também pode anexar PDFs para eu ler e extrair contrato, empenho, nota fiscal, objeto, valores, datas e credor.'
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Preparando resposta...');
  const [lastActions, setLastActions] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  useEffect(() => {
    const cleanMessages = messages.slice(-40).map((message) => ({
      ...message,
      text: cleanAiText(message.text)
    }));
    localStorage.setItem('fiscalpro_ai_messages', JSON.stringify(cleanMessages));
  }, [messages]);

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

    const compactNotes = notes.slice(0, 80).map((item) => ({
      numero: item.noteNumber,
      contrato: item.contractNum,
      credor: item.creditor,
      valor: item.value,
      status: item.status,
      empenho: item.commitmentNumber,
      dotacao: item.budgetAllocation,
      programa: item.program,
      dataEmissao: item.issueDate,
      dataAtesto: item.attestationDate,
      fiscal: item.fiscalName
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
      notas: compactNotes,
      credores: compactCreditors,
      dotacoes: {
        '06.01': PROGRAMS_BY_ALLOCATION['06.01'],
        '06.06': PROGRAMS_BY_ALLOCATION['06.06']
      }
    });
  }, [contracts, creditors, commitments, notes]);

  const buildSystemAudit = (): AiResponse => {
    const actions: AiAction[] = [];
    const findings: string[] = [];

    contracts.forEach((contract) => {
      const missing = [
        !contract.object ? 'objeto' : '',
        !contract.endDate ? 'vencimento' : '',
        !contract.fiscalName ? 'nome do fiscal' : ''
      ].filter(Boolean);

      if (missing.length > 0) {
        findings.push(`Contrato ${contract.contractNum} (${contract.creditor}) com dados pendentes: ${missing.join(', ')}.`);
        actions.push({
          type: 'create_alert',
          title: `Dados pendentes no contrato ${contract.contractNum}`,
          desc: `Verificar e completar: ${missing.join(', ')}. Credor: ${contract.creditor}.`,
          linkTab: 'contratos-lancados'
        });
      }

      const remainingDays = daysUntil(contract.endDate);
      if (remainingDays !== null && remainingDays <= 30) {
        const statusText = remainingDays < 0 ? `vencido ha ${Math.abs(remainingDays)} dia(s)` : `vence em ${remainingDays} dia(s)`;
        findings.push(`Contrato ${contract.contractNum} (${contract.creditor}) ${statusText}.`);
        actions.push({
          type: 'create_alert',
          title: `Vencimento do contrato ${contract.contractNum}`,
          desc: `O contrato ${contract.contractNum}, credor ${contract.creditor}, ${statusText}.`,
          linkTab: 'contratos-lancados'
        });
      }
    });

    commitments.forEach((commitment) => {
      const baseValue = Number(commitment.value || 0);
      const currentBalance = Number(commitment.currentBalance || 0);
      const lowByPercent = baseValue > 0 && currentBalance / baseValue <= 0.2;
      const lowByAmount = currentBalance > 0 && currentBalance <= 1000;

      if (currentBalance < 0 || lowByPercent || lowByAmount) {
        const severity = currentBalance < 0 ? 'saldo negativo' : 'saldo baixo';
        findings.push(`Empenho ${commitment.number} com ${severity}: ${formatCurrency(currentBalance)}.`);
        actions.push({
          type: 'create_alert',
          title: `Alerta de saldo do empenho ${commitment.number}`,
          desc: `Saldo atual: ${formatCurrency(currentBalance)}. Dotação ${commitment.budgetAllocation}, programa ${commitment.program}.`,
          linkTab: 'empenhos'
        });
      }
    });

    notes.forEach((note) => {
      if (!note.commitmentNumber || !note.budgetAllocation || !note.program) {
        findings.push(`Nota ${note.noteNumber} sem vínculo completo de empenho/dotação/programa.`);
        actions.push({
          type: 'create_alert',
          title: `Nota ${note.noteNumber} sem empenho completo`,
          desc: `Vincule a nota ao empenho correto para puxar dotação, programa e saldo.`,
          linkTab: 'notas'
        });
      }

      if (note.status === 'Pendente' && !note.attestationDate) {
        findings.push(`Nota ${note.noteNumber} permanece pendente de atesto.`);
        actions.push({
          type: 'create_alert',
          title: `Nota ${note.noteNumber} pendente de atesto`,
          desc: `Informe a data de atesto para marcar a nota como concluída.`,
          linkTab: 'notas'
        });
      }
    });

    if (findings.length === 0) {
      return {
        reply:
          'Olá! Fiz uma análise do sistema e, no momento, não identifiquei contratos, notas, empenhos ou saldos com pendência crítica. A base está bem organizada.'
      };
    }

    return {
      reply: `Olá! Fiz uma análise do sistema e encontrei estes pontos que precisam de atenção:\n${findings
        .slice(0, 8)
        .map((item) => `- ${item}`)
        .join('\n')}`,
      actions
    };
  };

  const shouldRunSystemAudit = (promptText: string, fileCount: number) => {
    const lower = promptText.toLowerCase();
    return (
      fileCount > 0 ||
      lower.includes('analise') ||
      lower.includes('análise') ||
      lower.includes('alerta') ||
      lower.includes('verificar sistema') ||
      lower.includes('pendencia') ||
      lower.includes('pendência') ||
      lower.includes('saldo') ||
      lower.includes('vencimento') ||
      lower.includes('processo')
    );
  };

  const ensureProfessionalGreeting = (reply: string, auditReply?: string) => {
    const cleaned = (reply || '').trim();
    const withGreeting = /^ol[aá]/i.test(cleaned) ? cleaned : `Olá! ${cleaned || 'Concluí a análise solicitada.'}`;

    if (!auditReply || withGreeting.toLowerCase().includes('análise do sistema') || withGreeting.toLowerCase().includes('analise do sistema')) {
      return withGreeting;
    }

    return `${withGreeting}\n\n${auditReply}`;
  };

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
            category: action.category || 'Saúde',
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
            category: action.category || 'Secretaria Municipal de Saúde',
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
            contractNum: action.contractNum || selectedContract?.contractNum || 'Contrato Não Selecionado',
            creditor: action.creditor || selectedContract?.creditor || 'Credor Não Identificado',
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

      if (action.type === 'create_alert' && action.title) {
        const key = `${normalize(action.title)}|${normalize(action.desc || '')}`;
        if (emittedAlertKeysRef.current.has(key)) return;
        emittedAlertKeysRef.current.add(key);

        onAddAlert({
          title: action.title,
          desc: action.desc || 'Alerta emitido pela IA FiscalPro.',
          linkTab: action.linkTab
        });
        executed.push(`Alerta emitido: ${action.title}`);
      }
    });

    setLastActions(executed);
    return executed;
  };

  const handleAttachFiles = async (files: FileList | null) => {
    if (!files) return;
    const pdfFiles = Array.from(files).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    const converted = await Promise.all(
      pdfFiles.map(
        (file) =>
          new Promise<AttachedFile>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: `pdf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                filename: file.name,
                fileData: String(reader.result),
                size: file.size
              });
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    );

    setAttachedFiles((prev) => [...prev, ...converted]);
  };

  const sendMessage = async () => {
    const prompt = input.trim();
    if ((!prompt && attachedFiles.length === 0) || isLoading) return;

    const fileSummary = attachedFiles.length
      ? `\n\nArquivos anexados:\n${attachedFiles.map((file) => `- ${file.filename}`).join('\n')}`
      : '';
    const finalPrompt =
      prompt ||
      'Analise os PDFs anexados, extraia dados de contrato, empenho e nota fiscal, emita alertas relevantes e cadastre o que tiver dados suficientes.';

    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: `${finalPrompt}${fileSummary}` };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const filesToSend = attachedFiles;
    setAttachedFiles([]);
    setIsLoading(true);
    setLastActions([]);
    const runAudit = shouldRunSystemAudit(finalPrompt, filesToSend.length);
    const nextLoadingText = filesToSend.length > 0
      ? 'Lendo anexos e extraindo informações...'
      : runAudit
      ? 'Analisando o sistema e preparando resposta...'
      : 'Preparando resposta...';
    setLoadingText(filesToSend.length > 0 ? 'Lendo anexos e extraindo informa\u00e7\u00f5es...' : cleanAiText(nextLoadingText));

    try {
      const audit = runAudit ? buildSystemAudit() : undefined;
      const supabaseConfig = getSupabaseConfig();
      const response = await fetch(`${supabaseConfig.url}/functions/v1/openrouter-chat`, {
        method: 'POST',
        headers: {
          apikey: supabaseConfig.anonKey,
          Authorization: `Bearer ${supabaseConfig.anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: finalPrompt, systemContext, localAudit: audit?.reply || '', files: filesToSend })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.error) {
        const fallback = createLocalResponse(finalPrompt);
        const executed = executeActions([...(audit?.actions || []), ...(fallback.actions || [])]);
        const executedText = executed.length ? `\n\nAções executadas:\n${executed.map((item) => `- ${item}`).join('\n')}` : '';

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: `${ensureProfessionalGreeting(fallback.reply, audit?.reply)}\n\nOpenRouter não respondeu agora, usei leitura rápida local.${executedText}`
          }
        ]);
        return;
      }

      const text = data?.choices?.[0]?.message?.content || '';
      const aiResponse = parseJsonResponse(text);
      const executed = executeActions([...(audit?.actions || []), ...(aiResponse.actions || [])]);
      const executedText = executed.length ? `\n\nAções executadas:\n${executed.map((item) => `- ${item}`).join('\n')}` : '';

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `${ensureProfessionalGreeting(aiResponse.reply || 'Pronto.', audit?.reply)}${executedText}`
        }
      ]);
    } catch (error) {
      console.error(error);
      const audit = runAudit ? buildSystemAudit() : undefined;
      const fallback = createLocalResponse(finalPrompt);
      const executed = executeActions([...(audit?.actions || []), ...(fallback.actions || [])]);
      const executedText = executed.length ? `\n\nAções executadas:\n${executed.map((item) => `- ${item}`).join('\n')}` : '';

      setMessages((prev) => [
        ...prev,
        {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: `${ensureProfessionalGreeting(fallback.reply, audit?.reply)}\n\nNão consegui falar com o OpenRouter agora, usei leitura rápida local.${executedText}`
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
              <h1 className="text-base font-medium text-slate-900">IA FiscalPro</h1>
              <p className="text-xs text-slate-500">Contratos, notas, empenhos, objetos e cadastros automáticos.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
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
                <span>{loadingText}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file) => (
                <div key={file.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span className="font-medium max-w-[220px] truncate">{file.filename}</span>
                  <button
                    onClick={() => setAttachedFiles((prev) => prev.filter((item) => item.id !== file.id))}
                    className="p-0.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Remover PDF"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label
              className="w-12 h-12 self-end inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Anexar PDF"
            >
              <Paperclip className="w-5 h-5" />
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(event) => {
                  handleAttachFiles(event.target.files);
                  event.target.value = '';
                }}
              />
            </label>
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
              placeholder="Digite uma orientação ou anexe PDFs para extrair contrato, empenho, nota fiscal, alertas e cadastros..."
              className="flex-1 resize-none px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
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
          <h2 className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-emerald-600" />
            <span>O que ela faz</span>
          </h2>
          <div className="mt-3 space-y-2 text-xs text-slate-600">
            <p>Identifica objeto, número de contrato, credor, empenho, dotação, programa e valores.</p>
            <p>Lê PDFs anexados e extrai informações de contratos, empenhos e notas fiscais.</p>
            <p>Cadastra contrato, empenho, credor e nota quando os dados estiverem completos.</p>
            <p>Emite alertas administrativos para o usuário quando detectar risco ou pendência.</p>
            <p>Ao lançar nota, desconta do saldo do empenho pelo fluxo normal do sistema.</p>
            <p>Remove PDFs anexados antes do envio pelo botão ao lado do arquivo.</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-xs font-medium uppercase text-slate-400">Base carregada</h3>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
              <p className="text-lg font-medium text-slate-900">{contracts.length}</p>
              <p className="text-[10px] text-slate-500">Contratos</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
              <p className="text-lg font-medium text-slate-900">{commitments.length}</p>
              <p className="text-[10px] text-slate-500">Empenhos</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
              <p className="text-lg font-medium text-slate-900">{creditors.length}</p>
              <p className="text-[10px] text-slate-500">Credores</p>
            </div>
          </div>
        </div>

        {lastActions.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-medium uppercase text-slate-400">Últimas ações</h3>
            <div className="mt-3 space-y-2">
              {lastActions.map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-emerald-700 font-medium">
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
