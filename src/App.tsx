import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Clock,
  Users,
  Receipt,
  Calendar,
  ShoppingCart,
  X,
  FileCheck2,
  Building2,
  Layers,
  Bookmark,
  PlusCircle,
  ArrowUpRight,
  Database,
  Trash2,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Link2,
  Edit3
} from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MetricCard } from './components/MetricCard';
import { ContractTable } from './components/ContractTable';
import { ContractControlView } from './components/ContractControlView';
import { NewContractView } from './components/NewContractView';
import { SecurityModal } from './components/SecurityModal';
import { CreditorsView } from './components/CreditorsView';
import { InvoicesView } from './components/InvoicesView';
import { ReportsView } from './components/ReportsView';
import { ContractFiscalizationReportsView } from './components/ContractFiscalizationReportsView';
import { AlertsView } from './components/AlertsView';
import { FiscaisView } from './components/FiscaisView';
import { AmendmentsView } from './components/AmendmentsView';
import { PurchaseOrdersView } from './components/PurchaseOrdersView';
import { AdministrativeNotificationView } from './components/AdministrativeNotificationView';
import { GeneratedNotificationsView } from './components/GeneratedNotificationsView';
import { CommitmentsView } from './components/CommitmentsView';
import { AiAssistantView } from './components/AiAssistantView';
import { AuthModal } from './components/AuthModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { supabase } from './lib/supabase';
import {
  UserProfile,
  fetchContractsFromSupabase,
  saveContractToSupabase,
  deleteContractFromSupabase,
  fetchCreditorsFromSupabase,
  saveCreditorToSupabase,
  deleteCreditorFromSupabase,
  fetchNotesFromSupabase,
  saveNoteToSupabase,
  deleteNoteFromSupabase,
  fetchCommitmentsFromSupabase,
  saveCommitmentToSupabase,
  deleteCommitmentFromSupabase,
  fetchFiscaisFromSupabase,
  saveFiscalToSupabase,
  deleteFiscalFromSupabase,
  fetchAmendmentsFromSupabase,
  saveAmendmentToSupabase,
  deleteAmendmentFromSupabase,
  fetchPurchaseOrdersFromSupabase,
  savePurchaseOrderToSupabase,
  deletePurchaseOrderFromSupabase
} from './lib/supabaseService';

import { Contract, ActiveTab, Creditor, ServiceNote, FiscalPortaria, ContractAmendment, SystemNotification, Commitment, ContractItem, PurchaseOrder, GeneratedAdministrativeNotification } from './types';
import { formatBRDate, parseBRDate } from './utils/dateFormat';

const DEFAULT_CATEGORIES = [
  'Secretaria Municipal de Saúde',
  'Fundo Municipal de Saúde'
];

const parseContractEndDate = (endDate: string) => {
  return parseBRDate(endDate);
};

const getDaysUntilDate = (endDate: string) => {
  const target = parseContractEndDate(endDate);
  if (!target) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDate = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
const parseNoteCompetencyDate = (note: ServiceNote) => {
  const value = note.attestationDate || note.issueDate || '';
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1])).getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const isNoteLinkedToCommitment = (note: ServiceNote, commitment: Commitment) =>
  note.commitmentId === commitment.id || (!!note.commitmentNumber && note.commitmentNumber === commitment.number);

const getNoteUniqueKey = (note: ServiceNote) =>
  `${note.noteNumber || ''}|${note.contractNum || ''}`.toLowerCase().trim();

const getCommitmentMergeKey = (commitment: Commitment) =>
  (commitment.id || commitment.number || '').toLowerCase().trim();

const mergeCommitmentsPreservingLocal = (localCommitments: Commitment[], remoteCommitments: Commitment[]) => {
  const remoteByKey = new Map(remoteCommitments.map((commitment) => [getCommitmentMergeKey(commitment), commitment]));
  const localKeys = new Set(localCommitments.map(getCommitmentMergeKey));
  const mergedLocal = localCommitments.map((commitment) => remoteByKey.get(getCommitmentMergeKey(commitment)) || commitment);
  const remoteOnly = remoteCommitments.filter((commitment) => !localKeys.has(getCommitmentMergeKey(commitment)));

  return [...mergedLocal, ...remoteOnly];
};

const getCommitmentsMissingRemotely = (localCommitments: Commitment[], remoteCommitments: Commitment[]) => {
  const remoteKeys = new Set(remoteCommitments.map(getCommitmentMergeKey));
  return localCommitments.filter((commitment) => !remoteKeys.has(getCommitmentMergeKey(commitment)));
};
const normalizeSearchValue = (value: unknown) =>
  String(value ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getExternalUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
};

const matchesSearch = (term: string, values: unknown[]) => {
  const needle = normalizeSearchValue(term);
  if (!needle) return true;
  return values.some((value) => normalizeSearchValue(value).includes(needle));
};

const getInclusiveMonthCount = (start?: string, end?: string) => {
  const startDate = parseBRDate(start);
  const endDate = parseBRDate(end);
  if (!startDate || !endDate) return 0;
  const count = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth() + 1;
  return Math.max(0, count);
};

const isMonthlyRebalanceAmendment = (type: ContractAmendment['type']) => {
  const normalizedType = normalizeSearchValue(type);
  return normalizedType.includes('realinhamento') || normalizedType.includes('reajuste') || normalizedType.includes('repactuacao');
};

const isExecutedNote = (note: ServiceNote) => note.status === 'Paga' || note.status === 'Concluido' || note.status === 'Emitida';

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const getValueRebalance = (
  contract: Contract,
  amendment: Omit<ContractAmendment, 'id'> | ContractAmendment,
  contractNotes: ServiceNote[]
) => {
  if (!isMonthlyRebalanceAmendment(amendment.type)) return null;

  const newMonthlyValue = Number(amendment.valueChange || 0);
  if (newMonthlyValue <= 0) return null;

  const effectiveDate = parseBRDate(amendment.signatureDate) || parseBRDate(amendment.publicationDate);
  const endDateText = amendment.newEndDate || contract.endDate;
  const totalMonths = getInclusiveMonthCount(contract.startDate, endDateText);
  const adjustedMonths = effectiveDate ? getInclusiveMonthCount(formatBRDate(amendment.signatureDate || amendment.publicationDate), endDateText) : 0;
  if (totalMonths <= 0 || adjustedMonths <= 0) return null;

  const effectiveMonthStart = getMonthStart(effectiveDate!);
  const paidNotesBeforeBreak = contractNotes.filter((note) => {
    if (note.contractNum !== contract.contractNum || !isExecutedNote(note)) return false;
    const noteDate = parseBRDate(note.attestationDate || note.issueDate);
    return !!noteDate && noteDate.getTime() < effectiveMonthStart.getTime();
  });

  const oldMonthlyValue = contract.totalValue / totalMonths;
  const paidBeforeBreak = paidNotesBeforeBreak.length > 0
    ? paidNotesBeforeBreak.reduce((sum, note) => sum + Number(note.value || 0), 0)
    : Math.max(0, totalMonths - adjustedMonths) * oldMonthlyValue;
  const targetTotalValue = paidBeforeBreak + adjustedMonths * newMonthlyValue;
  const impact = targetTotalValue - contract.totalValue;

  if (!Number.isFinite(impact) || Math.abs(impact) < 0.01) return null;

  return {
    adjustedMonths,
    impact,
    newMonthlyValue,
    paidBeforeBreak,
    targetTotalValue
  };
};

const ACTIVE_TABS: ActiveTab[] = [
  'dashboard',
  'contratos-lancados',
  'controle-contratos',
  'lancar-contrato',
  'fiscais',
  'credores',
  'empenhos',
  'notas',
  'aditivos',
  'ordens-compra',
  'notificacao-administrativa',
  'notificacoes-geradas',
  'relatorios',
  'relatorio-fiscalizacao',
  'alertas',
  'ia'
];

const normalizeAlertTab = (tab?: string): ActiveTab => {
  if (tab && (ACTIVE_TABS as string[]).includes(tab)) return tab as ActiveTab;
  if (tab === 'contratos') return 'contratos-lancados';
  return 'ia';
};

export default function App() {
  const balanceSyncSignatureRef = useRef('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // User Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('sigec_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(() => {
    return !currentUser;
  });

  const canViewDocuments = Boolean(currentUser);

  // Supabase Auth and Sync Effect
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data: profile }) => {
              const userProf: UserProfile = {
                id: session.user.id,
                email: session.user.email || 'usuario@orgao.sp.gov.br',
                name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario Supabase',
                role: profile?.role || 'Administrador',
              };
              setCurrentUser(userProf);
              localStorage.setItem('sigec_user', JSON.stringify(userProf));
            })
            .catch((error) => {
              console.warn('Supabase profiles indisponivel; mantendo usuario local.', error);
            });
        }
      })
      .catch((error) => {
        console.warn('Supabase auth indisponivel; seguindo em modo local.', error);
      });

    fetchContractsFromSupabase().catch((error) => { console.warn('Supabase contratos indisponivel; mantendo dados locais.', error); return null; }).then((remoteContracts) => {
      if (remoteContracts) {
        setContracts((currentContracts) =>
          remoteContracts.map((remoteContract) => {
            const localContract = currentContracts.find(
              (contract) =>
                contract.id === remoteContract.id ||
                contract.contractNum.toLowerCase().trim() === remoteContract.contractNum.toLowerCase().trim()
            );
            return {
              ...remoteContract,
              items: localContract?.items || remoteContract.items || []
            };
          })
        );
      }
    });

    fetchCreditorsFromSupabase().catch((error) => { console.warn('Supabase credores indisponivel; mantendo dados locais.', error); return null; }).then((remoteCreditors) => {
      if (remoteCreditors) {
        setCreditors(remoteCreditors);
      }
    });

    fetchNotesFromSupabase().catch((error) => { console.warn('Supabase notas indisponivel; mantendo dados locais.', error); return null; }).then((remoteNotes) => {
      if (remoteNotes) {
        setNotes(remoteNotes);
      }
    });

    fetchCommitmentsFromSupabase().catch((error) => { console.warn('Supabase empenhos indisponivel; mantendo dados locais.', error); return null; }).then((remoteCommitments) => {
      if (remoteCommitments) {
        setCommitments((currentCommitments) => {
          getCommitmentsMissingRemotely(currentCommitments, remoteCommitments).forEach((commitment) => saveCommitmentToSupabase(commitment));
          return mergeCommitmentsPreservingLocal(currentCommitments, remoteCommitments);
        });
      }
    });

    fetchFiscaisFromSupabase().catch((error) => { console.warn('Supabase fiscais indisponivel; mantendo dados locais.', error); return null; }).then((remoteFiscais) => {
      if (remoteFiscais) {
        setFiscais(remoteFiscais);
      }
    });

    fetchAmendmentsFromSupabase().catch((error) => { console.warn('Supabase aditivos indisponivel; mantendo dados locais.', error); return null; }).then((remoteAmendments) => {
      if (remoteAmendments) {
        setAmendments(remoteAmendments);
      }
    });
  }, []);


  // Core Data States with localStorage persistence
  const [contracts, setContracts] = useState<Contract[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_contracts');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_categories');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CATEGORIES;
  });

  const [activities, setActivities] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_activities');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [aiAlerts, setAiAlerts] = useState<SystemNotification[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_ai_alerts');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [creditors, setCreditors] = useState<Creditor[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_creditors');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [notes, setNotes] = useState<ServiceNote[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_notes');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [commitments, setCommitments] = useState<Commitment[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_commitments');
      const backup = localStorage.getItem('fiscalpro_commitments_backup');
      const parsedSaved = saved !== null ? JSON.parse(saved) : [];
      const parsedBackup = backup !== null ? JSON.parse(backup) : [];

      if (Array.isArray(parsedSaved) && Array.isArray(parsedBackup)) {
        return mergeCommitmentsPreservingLocal(parsedBackup, parsedSaved);
      }
      if (Array.isArray(parsedSaved)) return parsedSaved;
      if (Array.isArray(parsedBackup)) return parsedBackup;
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [fiscais, setFiscais] = useState<FiscalPortaria[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_fiscais');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [amendments, setAmendments] = useState<ContractAmendment[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_amendments');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_purchase_orders');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [generatedAdministrativeNotifications, setGeneratedAdministrativeNotifications] = useState<GeneratedAdministrativeNotification[]>(() => {
    try {
      const saved = localStorage.getItem('fiscalpro_generated_administrative_notifications');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Automatically sync changes to LocalStorage
  useEffect(() => {
    localStorage.setItem('fiscalpro_contracts', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem('fiscalpro_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('fiscalpro_ai_alerts', JSON.stringify(aiAlerts));
  }, [aiAlerts]);

  useEffect(() => {
    localStorage.setItem('fiscalpro_creditors', JSON.stringify(creditors));
  }, [creditors]);

  useEffect(() => {
    localStorage.setItem('fiscalpro_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('fiscalpro_commitments', JSON.stringify(commitments));
    if (commitments.length > 0) {
      localStorage.setItem('fiscalpro_commitments_backup', JSON.stringify(commitments));
    }
  }, [commitments]);

  useEffect(() => {
    localStorage.setItem('fiscalpro_fiscais', JSON.stringify(fiscais));
  }, [fiscais]);

  useEffect(() => {
    localStorage.setItem('fiscalpro_amendments', JSON.stringify(amendments));
  }, [amendments]);

  useEffect(() => {
    localStorage.setItem('fiscalpro_purchase_orders', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);
  useEffect(() => {
    localStorage.setItem('fiscalpro_generated_administrative_notifications', JSON.stringify(generatedAdministrativeNotifications));
  }, [generatedAdministrativeNotifications]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setGeneratedAdministrativeNotifications((current) => {
      let changed = false;
      const next = current.map((notification) => {
        const deadline = parseBRDate(notification.responseDeadline);
        if (notification.status !== 'Pendente' || !deadline || deadline.getTime() >= today.getTime()) return notification;
        changed = true;
        return { ...notification, status: 'Sem resposta' as const };
      });
      return changed ? next : current;
    });
  }, [generatedAdministrativeNotifications]);

  useEffect(() => {
    localStorage.setItem('fiscalpro_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    let isActive = true;

    const syncRemoteData = async () => {
      try {
        const [remoteContracts, remoteCreditors, remoteNotes, remoteCommitments, remoteFiscais, remoteAmendments, remotePurchaseOrders] = await Promise.all([
          fetchContractsFromSupabase().catch((error) => { console.warn('Supabase contratos indisponivel; mantendo dados locais.', error); return null; }),
          fetchCreditorsFromSupabase().catch((error) => { console.warn('Supabase credores indisponivel; mantendo dados locais.', error); return null; }),
          fetchNotesFromSupabase().catch((error) => { console.warn('Supabase notas indisponivel; mantendo dados locais.', error); return null; }),
          fetchCommitmentsFromSupabase().catch((error) => { console.warn('Supabase empenhos indisponivel; mantendo dados locais.', error); return null; }),
          fetchFiscaisFromSupabase().catch((error) => { console.warn('Supabase fiscais indisponivel; mantendo dados locais.', error); return null; }),
          fetchAmendmentsFromSupabase().catch((error) => { console.warn('Supabase aditivos indisponivel; mantendo dados locais.', error); return null; }),
          fetchPurchaseOrdersFromSupabase().catch((error) => { console.warn('Supabase ordens de compra indisponivel; mantendo dados locais.', error); return null; })
        ]);

        if (!isActive) return;

        if (remoteContracts) {
          setContracts((currentContracts) => {
            if (remoteContracts.length === 0 && currentContracts.length > 0) return currentContracts;
            return remoteContracts.map((remoteContract) => {
              const localContract = currentContracts.find(
                (contract) =>
                  contract.id === remoteContract.id ||
                  contract.contractNum.toLowerCase().trim() === remoteContract.contractNum.toLowerCase().trim()
              );
              return {
                ...remoteContract,
                items: remoteContract.items?.length ? remoteContract.items : localContract?.items || []
              };
            });
          });
        }
        if (remoteCreditors) setCreditors((current) => remoteCreditors.length === 0 && current.length > 0 ? current : remoteCreditors);
        if (remoteNotes) setNotes((current) => remoteNotes.length === 0 && current.length > 0 ? current : remoteNotes);
        if (remoteCommitments) setCommitments((current) => {
          getCommitmentsMissingRemotely(current, remoteCommitments).forEach((commitment) => saveCommitmentToSupabase(commitment));
          return mergeCommitmentsPreservingLocal(current, remoteCommitments);
        });
        if (remoteFiscais) setFiscais((current) => remoteFiscais.length === 0 && current.length > 0 ? current : remoteFiscais);
        if (remoteAmendments) setAmendments((current) => remoteAmendments.length === 0 && current.length > 0 ? current : remoteAmendments);
        if (remotePurchaseOrders) setPurchaseOrders((current) => remotePurchaseOrders.length === 0 && current.length > 0 ? current : remotePurchaseOrders);
      } catch (error) {
        console.warn('Sincronizacao automatica indisponivel; mantendo dados locais.', error);
      }
    };

    const handleFocusSync = () => syncRemoteData();
    const handleVisibilitySync = () => {
      if (!document.hidden) syncRemoteData();
    };

    syncRemoteData();
    const intervalId = window.setInterval(syncRemoteData, 15000);
    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleVisibilitySync);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleVisibilitySync);
    };
  }, []);

  useEffect(() => {
    if (commitments.length === 0) return;

    const seenNoteKeys = new Set<string>();
    const duplicateNotes: ServiceNote[] = [];
    const uniqueNotes = notes.filter((note) => {
      const key = getNoteUniqueKey(note);
      if (seenNoteKeys.has(key)) {
        duplicateNotes.push(note);
        return false;
      }
      seenNoteKeys.add(key);
      return true;
    });

    const adjustedNotes = uniqueNotes.map((note) => ({ ...note }));

    commitments.forEach((commitment) => {
      let runningBalance = Number(commitment.value || 0);
      adjustedNotes
        .filter((note) => isNoteLinkedToCommitment(note, commitment))
        .sort((a, b) => parseNoteCompetencyDate(a) - parseNoteCompetencyDate(b) || a.noteNumber.localeCompare(b.noteNumber))
        .forEach((note) => {
          note.commitmentId = commitment.id;
          note.commitmentNumber = commitment.number;
          note.commitmentValue = commitment.value;
          note.budgetAllocation = commitment.budgetAllocation;
          note.program = commitment.program;
          note.commitmentBalance = runningBalance;
          runningBalance -= Number(note.value || 0);
          note.currentBalance = runningBalance;
        });
    });

    const adjustedCommitments = commitments.map((commitment) => {
      const usedValue = adjustedNotes
        .filter((note) => isNoteLinkedToCommitment(note, commitment))
        .reduce((sum, note) => sum + Number(note.value || 0), 0);
      return {
        ...commitment,
        currentBalance: Number(commitment.value || 0) - usedValue
      };
    });

    const signature = JSON.stringify({
      notes: adjustedNotes.map((note) => [
        note.id,
        note.noteNumber,
        note.contractNum,
        note.attestationDate,
        note.value,
        note.commitmentId,
        note.commitmentBalance,
        note.currentBalance
      ]),
      commitments: adjustedCommitments.map((commitment) => [commitment.id, commitment.currentBalance])
    });

    if (signature === balanceSyncSignatureRef.current) return;
    balanceSyncSignatureRef.current = signature;

    const notesChanged =
      duplicateNotes.length > 0 ||
      adjustedNotes.length !== notes.length ||
      adjustedNotes.some((note, index) => JSON.stringify(note) !== JSON.stringify(notes[index]));
    const commitmentsChanged = adjustedCommitments.some(
      (commitment, index) => commitment.currentBalance !== commitments[index]?.currentBalance
    );

    if (notesChanged) {
      setNotes(adjustedNotes);
      adjustedNotes.forEach((note) => saveNoteToSupabase(note));
      duplicateNotes.forEach((note) => deleteNoteFromSupabase(note.id));
    }

    if (commitmentsChanged) {
      setCommitments(adjustedCommitments);
      adjustedCommitments.forEach((commitment, index) => {
        if (commitment.currentBalance !== commitments[index]?.currentBalance) {
          saveCommitmentToSupabase(commitment);
        }
      });
    }
  }, [notes, commitments]);

  const handleAddCategory = (newCat: string) => {
    const trimmed = newCat.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
    }
  };

  // Handlers for managing test storage
  const handleClearAllData = () => {
    if (window.confirm('Deseja realmente apagar todos os dados do LocalStorage? A base ficará zerada.')) {
      setContracts([]);
      setActivities([]);
      setAiAlerts([]);
      setCreditors([]);
      setNotes([]);
      setCommitments([]);
      setFiscais([]);
      setAmendments([]);
      setPurchaseOrders([]);
      localStorage.removeItem('fiscalpro_contracts');
      localStorage.removeItem('fiscalpro_activities');
      localStorage.removeItem('fiscalpro_ai_alerts');
      localStorage.removeItem('fiscalpro_creditors');
      localStorage.removeItem('fiscalpro_notes');
      localStorage.removeItem('fiscalpro_commitments');
      localStorage.removeItem('fiscalpro_commitments_backup');
      localStorage.removeItem('fiscalpro_fiscais');
      localStorage.removeItem('fiscalpro_amendments');
      localStorage.removeItem('fiscalpro_purchase_orders');
      localStorage.removeItem('fiscalpro_generated_administrative_notifications');
    }
  };

  // Modals
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [selectedContractDetail, setSelectedContractDetail] = useState<Contract | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editingAmendmentFromDetails, setEditingAmendmentFromDetails] = useState<ContractAmendment | null>(null);
  const [administrativeNotificationOrder, setAdministrativeNotificationOrder] = useState<PurchaseOrder | null>(null);

  // Handle Tab Switch
  const handleTabChange = (tab: ActiveTab) => {
    if (tab === 'lancar-contrato') {
      setEditingContract(null);
    }
    setActiveTab(tab);
  };

  const globalSearchTerm = searchTerm.trim();

  // Global search filters
  const filteredContracts = contracts.filter((c) =>
    matchesSearch(globalSearchTerm, [c.contractNum, c.creditor, c.object, canViewDocuments ? c.contractLink : '', c.category, c.status])
  );
  const filteredCreditors = creditors.filter((c) =>
    matchesSearch(globalSearchTerm, [c.name, c.cnpj, c.category, c.status])
  );
  const filteredNotes = notes.filter((n) =>
    matchesSearch(globalSearchTerm, [n.noteNumber, n.contractNum, n.creditor, n.status, n.issueDate, n.attestationDate])
  );
  const filteredCommitments = commitments.filter((c) =>
    matchesSearch(globalSearchTerm, [c.number, c.budgetAllocation, c.program, c.description])
  );
  const filteredFiscais = fiscais.filter((f) =>
    matchesSearch(globalSearchTerm, [f.name, f.portaria, f.organ, f.publicationDate, f.validity])
  );
  const filteredAmendments = amendments.filter((a) =>
    matchesSearch(globalSearchTerm, [a.amendmentNum, canViewDocuments ? a.amendmentLink : '', a.contractNum, a.creditor, a.type, a.status, a.justification])
  );
  const filteredPurchaseOrders = purchaseOrders.filter((order) =>
    matchesSearch(globalSearchTerm, [order.orderNumber, order.companyName, order.cnpj, order.expectedDeliveryDate, order.status])
  );

  const handleHeaderSearch = (term: string) => {
    setSearchTerm(term);

    const q = term.trim();
    if (!q) return;

    if (contracts.some((c) => matchesSearch(q, [c.contractNum, c.creditor, c.object, c.category, c.status]))) {
      setActiveTab('contratos-lancados');
    } else if (notes.some((n) => matchesSearch(q, [n.noteNumber, n.contractNum, n.creditor, n.status]))) {
      setActiveTab('notas');
    } else if (creditors.some((c) => matchesSearch(q, [c.name, c.cnpj, c.category, c.status]))) {
      setActiveTab('credores');
    } else if (fiscais.some((f) => matchesSearch(q, [f.name, f.portaria, f.organ]))) {
      setActiveTab('fiscais');
    } else if (commitments.some((c) => matchesSearch(q, [c.number, c.budgetAllocation, c.program, c.description]))) {
      setActiveTab('empenhos');
    } else if (amendments.some((a) => matchesSearch(q, [a.amendmentNum, canViewDocuments ? a.amendmentLink : '', a.contractNum, a.creditor, a.type, a.status]))) {
      setActiveTab('aditivos');
    } else if (purchaseOrders.some((order) => matchesSearch(q, [order.orderNumber, order.companyName, order.cnpj, order.expectedDeliveryDate, order.status]))) {
      setActiveTab('ordens-compra');
    }
  };

  const dashboardContracts = [...contracts].sort((a, b) => {
    const aDate = parseContractEndDate(a.endDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDate = parseContractEndDate(b.endDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aDate - bDate;
  });

  const expiringContracts60Days = dashboardContracts.filter((c) => {
    const daysRemaining = getDaysUntilDate(c.endDate);
    return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 60;
  });

  const purchaseOrdersDeliveryAlerts = purchaseOrders
    .filter((order) => order.status === 'Pendente')
    .map((order) => ({ ...order, daysRemaining: getDaysUntilDate(order.expectedDeliveryDate) }))
    .filter((order) => order.daysRemaining !== null && order.daysRemaining >= 0 && order.daysRemaining <= 7)
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

  // Handlers
  const handleAddPurchaseOrder = (order: PurchaseOrder) => {
    setPurchaseOrders([order, ...purchaseOrders]);
    savePurchaseOrderToSupabase(order);
    setActivities([
      {
        id: `act-${Date.now()}`,
        type: 'purchase',
        title: `Ordem de compras ${order.orderNumber} foi lançada`,
        time: 'Agora',
        iconColor: 'amber'
      },
      ...activities
    ]);
  };

  const handleUpdatePurchaseOrder = (order: PurchaseOrder) => {
    setPurchaseOrders(purchaseOrders.map((item) => (item.id === order.id ? order : item)));
    savePurchaseOrderToSupabase(order);
  };

  const handleDeletePurchaseOrder = (id: string) => {
    setPurchaseOrders(purchaseOrders.filter((order) => order.id !== id));
    deletePurchaseOrderFromSupabase(id);
  };

  const handleNotifyPurchaseOrder = (order: PurchaseOrder) => {
    setAdministrativeNotificationOrder(order);
    setActiveTab('notificacao-administrativa');
  };
  const handleRegisterGeneratedNotification = (notification: GeneratedAdministrativeNotification) => {
    setGeneratedAdministrativeNotifications((current) => [notification, ...current].slice(0, 100));
    setActiveTab('notificacoes-geradas');
  };

  const handleUpdateGeneratedNotification = (notification: GeneratedAdministrativeNotification) => {
    setGeneratedAdministrativeNotifications((current) => current.map((item) => item.id === notification.id ? notification : item));
  };

  const handleDeleteGeneratedNotification = (id: string) => {
    setGeneratedAdministrativeNotifications((current) => current.filter((item) => item.id !== id));
  };

  const handleAddContract = (newContract: Omit<Contract, 'id'>) => {
    const contract: Contract = {
      ...newContract,
      id: String(Date.now())
    };

    setContracts([contract, ...contracts]);
    saveContractToSupabase(contract);

    // Add activity entry
    setActivities([
      {
        id: `act-${Date.now()}`,
        type: 'contract',
        title: `Contrato ${contract.contractNum} foi cadastrado`,
        time: 'Agora',
        iconColor: 'green'
      },
      ...activities
    ]);
  };

  const handleUpdateContract = (updatedContract: Contract) => {
    setContracts(contracts.map((c) => (c.id === updatedContract.id ? updatedContract : c)));
    saveContractToSupabase(updatedContract);
    setEditingContract(null);
    setActiveTab('contratos-lancados');
  };

  const handleDeleteContract = (id: string) => {
    setContracts(contracts.filter((c) => c.id !== id));
    deleteContractFromSupabase(id);
  };

  const handleAddCreditor = (creditor: Creditor) => {
    setCreditors([creditor, ...creditors]);
    saveCreditorToSupabase(creditor);
  };

  const handleDeleteCreditor = (id: string) => {
    setCreditors(creditors.filter((c) => c.id !== id));
    deleteCreditorFromSupabase(id);
  };

  const handleUpdateCreditor = (creditor: Creditor) => {
    setCreditors(creditors.map((item) => (item.id === creditor.id ? creditor : item)));
    saveCreditorToSupabase(creditor);
  };

  const applyNotesAndRecalculateBalances = (nextNotes: ServiceNote[]) => {
    const seenNoteKeys = new Set<string>();
    const duplicateNotes: ServiceNote[] = [];
    const uniqueNotes = nextNotes.filter((note) => {
      const key = getNoteUniqueKey(note);
      if (seenNoteKeys.has(key)) {
        duplicateNotes.push(note);
        return false;
      }
      seenNoteKeys.add(key);
      return true;
    });
    const adjustedNotes = uniqueNotes.map((note) => ({ ...note }));

    commitments.forEach((commitment) => {
      let runningBalance = Number(commitment.value || 0);
      const linkedNotes = adjustedNotes
        .filter((note) => isNoteLinkedToCommitment(note, commitment))
        .sort((a, b) => parseNoteCompetencyDate(a) - parseNoteCompetencyDate(b) || a.noteNumber.localeCompare(b.noteNumber));

      linkedNotes.forEach((note) => {
        note.commitmentId = commitment.id;
        note.commitmentNumber = commitment.number;
        note.commitmentValue = commitment.value;
        note.budgetAllocation = commitment.budgetAllocation;
        note.program = commitment.program;
        note.commitmentBalance = runningBalance;
        runningBalance -= Number(note.value || 0);
        note.currentBalance = runningBalance;
      });
    });

    setNotes(adjustedNotes);
    adjustedNotes.forEach((note) => saveNoteToSupabase(note));
    duplicateNotes.forEach((note) => deleteNoteFromSupabase(note.id));

    setCommitments((prev) =>
      prev.map((commitment) => {
        const usedValue = adjustedNotes
          .filter((note) => isNoteLinkedToCommitment(note, commitment))
          .reduce((sum, note) => sum + Number(note.value || 0), 0);
        const updatedCommitment = {
          ...commitment,
          currentBalance: Number(commitment.value || 0) - usedValue
        };

        if (updatedCommitment.currentBalance !== commitment.currentBalance) {
          saveCommitmentToSupabase(updatedCommitment);
        }

        return updatedCommitment;
      })
    );
  };

  const handleAddNote = (note: ServiceNote) => {
    applyNotesAndRecalculateBalances([note, ...notes]);
  };

  const handleDeleteNote = (note: ServiceNote) => {
    const nextNotes = notes.filter((item) => item.id !== note.id);
    deleteNoteFromSupabase(note.id);
    applyNotesAndRecalculateBalances(nextNotes);
  };

  const handleUpdateNote = (note: ServiceNote) => {
    applyNotesAndRecalculateBalances(notes.map((item) => (item.id === note.id ? note : item)));
  };

  const handleAddAiAlert = (alert: { title: string; desc: string; linkTab?: ActiveTab }) => {
    const notification: SystemNotification = {
      id: `ai-alert-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: alert.title,
      desc: alert.desc,
      time: 'Agora',
      type: 'info',
      read: false,
      linkTab: normalizeAlertTab(alert.linkTab)
    };

    setAiAlerts((prev) => [notification, ...prev].slice(0, 30));
  };

  const handleAddCommitment = (newCommitment: Omit<Commitment, 'id' | 'currentBalance' | 'balance'> & { balance?: number }) => {
    const initialBalance = Number(newCommitment.value || 0);
    const commitment: Commitment = {
      ...newCommitment,
      id: `commitment-${Date.now()}`,
      balance: initialBalance,
      currentBalance: initialBalance
    };

    setCommitments([commitment, ...commitments]);
    saveCommitmentToSupabase(commitment);
  };

  const handleDeleteCommitment = (id: string) => {
    setCommitments(commitments.filter((commitment) => commitment.id !== id));
    deleteCommitmentFromSupabase(id);
  };

  const handleUpdateCommitment = (commitment: Commitment) => {
    setCommitments(commitments.map((item) => (item.id === commitment.id ? commitment : item)));
    saveCommitmentToSupabase(commitment);
  };

  const handleAddFiscal = (newFiscal: Omit<FiscalPortaria, 'id'>) => {
    const fiscal: FiscalPortaria = {
      ...newFiscal,
      id: `fiscal-${Date.now()}`
    };

    setFiscais([fiscal, ...fiscais]);
    saveFiscalToSupabase(fiscal);
  };

  const handleUpdateFiscal = (fiscal: FiscalPortaria) => {
    setFiscais(fiscais.map((f) => (f.id === fiscal.id ? fiscal : f)));
    saveFiscalToSupabase(fiscal);
  };

  const handleDeleteFiscal = (id: string) => {
    setFiscais(fiscais.filter((f) => f.id !== id));
    deleteFiscalFromSupabase(id);
  };

  const handleAddAmendment = (newAmend: Omit<ContractAmendment, 'id'>, updateContract: boolean = true, updatedItems?: ContractItem[]) => {
    const targetContract = contracts.find((c) => c.contractNum === newAmend.contractNum);
    const valueRebalance = targetContract ? getValueRebalance(targetContract, newAmend, notes) : null;
    const amendmentToSave: Omit<ContractAmendment, 'id'> = valueRebalance
      ? {
          ...newAmend,
          valueChange: valueRebalance.impact,
          justification: `${newAmend.justification}\n\nRec\u00e1lculo autom\u00e1tico: novo valor mensal de ${valueRebalance.newMonthlyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} aplicado a ${valueRebalance.adjustedMonths} compet\u00eancia(s) a partir do aditivo.`
        }
      : newAmend;

    const id = 'a' + Date.now();
    const createdItem: ContractAmendment = { ...amendmentToSave, id };
    setAmendments([createdItem, ...amendments]);
    saveAmendmentToSupabase(createdItem);

    if (updateContract) {
      setContracts(contracts.map((c) => {
        if (c.contractNum === amendmentToSave.contractNum) {
          const updatedValue = valueRebalance ? valueRebalance.targetTotalValue : amendmentToSave.valueChange ? c.totalValue + amendmentToSave.valueChange : c.totalValue;
          const updatedEndDate = amendmentToSave.newEndDate ? amendmentToSave.newEndDate : c.endDate;
          const updatedStatus = normalizeSearchValue(amendmentToSave.type).includes('rescis') ? 'Encerrado' : c.status;
          const updatedContract = {
            ...c,
            totalValue: updatedValue,
            endDate: updatedEndDate,
            status: updatedStatus as Contract['status'],
            items: updatedItems || c.items
          };
          saveContractToSupabase(updatedContract);
          return updatedContract;
        }
        return c;
      }));
    }

    setActivities([
      {
        id: 'act-' + Date.now(),
        type: 'additive',
        title: `${amendmentToSave.amendmentNum} registrado para o Contrato ${amendmentToSave.contractNum}`,
        time: 'Agora mesmo',
        iconColor: 'teal'
      },
      ...activities
    ]);
  };

  const handleUpdateAmendment = (updated: ContractAmendment, updateContract: boolean = false, updatedItems?: ContractItem[]) => {
    const previous = amendments.find((a) => a.id === updated.id);
    let amendmentToSave = updated;

    if (updateContract && isMonthlyRebalanceAmendment(updated.type)) {
      const targetContract = contracts.find((c) => c.contractNum === updated.contractNum);
      const previousImpact = previous?.contractNum === updated.contractNum ? Number(previous.valueChange || 0) : 0;
      const baseContract = targetContract ? { ...targetContract, totalValue: targetContract.totalValue - previousImpact } : undefined;
      const valueRebalance = baseContract ? getValueRebalance(baseContract, updated, notes) : null;

      if (valueRebalance) {
        const cleanJustification = updated.justification.split('\n\nRec\u00e1lculo autom\u00e1tico:')[0];
        amendmentToSave = {
          ...updated,
          valueChange: valueRebalance.impact,
          justification: `${cleanJustification}\n\nRec\u00e1lculo autom\u00e1tico: novo valor mensal de ${valueRebalance.newMonthlyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} aplicado a ${valueRebalance.adjustedMonths} compet\u00eancia(s) a partir do aditivo.`
        };
      }
    }

    setAmendments(amendments.map((a) => (a.id === amendmentToSave.id ? amendmentToSave : a)));
    saveAmendmentToSupabase(amendmentToSave);

    if (updateContract) {
      setContracts(contracts.map((c) => {
        const previousValueChange = previous?.contractNum === c.contractNum ? Number(previous.valueChange || 0) : 0;
        const nextValueChange = amendmentToSave.contractNum === c.contractNum ? Number(amendmentToSave.valueChange || 0) : 0;
        const touchesContract = previousValueChange !== 0 || nextValueChange !== 0 || amendmentToSave.contractNum === c.contractNum;

        if (touchesContract) {
          const updatedValue = c.totalValue - previousValueChange + nextValueChange;
          const updatedEndDate = amendmentToSave.contractNum === c.contractNum && amendmentToSave.newEndDate ? amendmentToSave.newEndDate : c.endDate;
          const updatedStatus = amendmentToSave.contractNum === c.contractNum && normalizeSearchValue(amendmentToSave.type).includes('rescis')
            ? 'Encerrado'
            : c.status;
          const updatedContract = {
            ...c,
            totalValue: updatedValue,
            endDate: updatedEndDate,
            status: updatedStatus as Contract['status'],
            items: amendmentToSave.contractNum === c.contractNum ? updatedItems || c.items : c.items
          };
          saveContractToSupabase(updatedContract);
          return updatedContract;
        }
        return c;
      }));
    }
  };

  const handleDeleteAmendment = (id: string) => {
    setAmendments(amendments.filter((a) => a.id !== id));
    deleteAmendmentFromSupabase(id);
  };

  // Notification state
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  // Calculate dynamic real notifications from live database records
  const realNotifications = React.useMemo(() => {
    const items: SystemNotification[] = [];

    aiAlerts.forEach((alert) => {
      items.push({
        ...alert,
        read: readNotificationIds.includes(alert.id) || alert.read
      });
    });

    // 1. Contratos com status 'A Vencer' ou próximos do vencimento
    contracts.forEach((c) => {
      if (c.status === 'A Vencer') {
        items.push({
          id: `contract-exp-${c.id}`,
          title: `Contrato A Vencer: ${c.creditor}`,
          desc: `Contrato: ${c.contractNum} | Vencimento: ${formatBRDate(c.endDate)}`,
          time: 'Atenção Vigência',
          type: 'contract',
          read: readNotificationIds.includes(`contract-exp-${c.id}`),
          linkTab: 'controle-contratos'
        });
      }
    });

    // 2. Notas de Serviço Pendentes
    notes.forEach((n) => {
      if (n.status === 'Pendente') {
        items.push({
          id: `note-pend-${n.id}`,
          title: `Nota Pendente Nº ${n.noteNumber}`,
          desc: `Empresa: ${n.creditor} | Valor: R$ ${n.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          time: n.issueDate || 'Aguardando Pagamento',
          type: 'note',
          read: readNotificationIds.includes(`note-pend-${n.id}`),
          linkTab: 'notas'
        });
      }
    });

    // 3. Aditivos de Contrato em Análise
    amendments.forEach((a) => {
      if (a.status === 'Em Análise') {
        items.push({
          id: `amend-an-${a.id}`,
          title: `Aditivo em Análise Nº ${a.amendmentNum}`,
          desc: `Contrato: ${a.contractNum} (${a.creditor})`,
          time: a.signatureDate || 'Em Análise',
          type: 'amendment',
          read: readNotificationIds.includes(`amend-an-${a.id}`),
          linkTab: 'aditivos'
        });
      }
    });

    // 4. Ordens de Compras com entrega próxima do vencimento
    purchaseOrdersDeliveryAlerts.forEach((order) => {
      items.push({
        id: `purchase-delivery-${order.id}`,
        title: `Entrega de Ordem de Compras Próxima: ${order.orderNumber}`,
        desc: `${order.companyName} | CNPJ: ${order.cnpj} | Entrega: ${formatBRDate(order.expectedDeliveryDate)}`,
        time: `Vence em ${order.daysRemaining}d`,
        type: 'purchase',
        read: readNotificationIds.includes(`purchase-delivery-${order.id}`),
        linkTab: 'ordens-compra'
      });
    });

    // 5. Lançamentos Recentes de Atividades

    generatedAdministrativeNotifications
      .filter((notification) => notification.status !== 'Concluido')
      .forEach((notification) => {
        const daysRemaining = getDaysUntilDate(notification.responseDeadline);
        const time = notification.status === 'Sem resposta'
          ? 'Sem resposta'
          : daysRemaining === null
            ? 'Prazo invalido'
            : daysRemaining < 0
              ? `Vencida ha ${Math.abs(daysRemaining)}d`
              : daysRemaining === 0
                ? 'Vence hoje'
                : `Vence em ${daysRemaining}d`;

        items.push({
          id: `generated-notification-${notification.id}`,
          title: `Resposta da notificacao: ${notification.orderNumber}`,
          desc: `${notification.companyName} | Prazo: ${formatBRDate(notification.responseDeadline)} | Status: ${notification.status}`,
          time,
          type: 'purchase',
          read: readNotificationIds.includes(`generated-notification-${notification.id}`),
          linkTab: 'notificacoes-geradas'
        });
      });
    activities.slice(0, 4).forEach((act) => {
      items.push({
        id: `act-${act.id}`,
        title: act.title,
        desc: 'Atividade recente registrada no sistema',
        time: act.time || 'Recente',
        type: 'info',
        read: readNotificationIds.includes(`act-${act.id}`),
        linkTab: 'dashboard'
      });
    });

    return items;
  }, [contracts, notes, amendments, purchaseOrdersDeliveryAlerts, generatedAdministrativeNotifications, activities, aiAlerts, readNotificationIds]);

  const unreadNotificationsCount = realNotifications.filter((n) => !n.read).length;

  const handleMarkAllNotificationsAsRead = () => {
    setReadNotificationIds(realNotifications.map((n) => n.id));
  };

  const handleNotificationClick = (id: string, linkTab?: ActiveTab) => {
    if (!readNotificationIds.includes(id)) {
      setReadNotificationIds((prev) => [...prev, id]);
    }
    if (linkTab) {
      setActiveTab(linkTab);
    }
  };

  // Compute live KPI counters
  const activeContractsCount = contracts.filter((c) => c.status === 'Ativo').length;
  const expiringContractsCount = expiringContracts60Days.length;
  const purchaseOrdersAlertCount = purchaseOrdersDeliveryAlerts.length;

  const handleLogout = () => {
    supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem('sigec_user');
    setShowWelcomeScreen(true);
    setIsAuthModalOpen(false);
  };

  if (showWelcomeScreen) {
    return (
      <WelcomeScreen
        onEnterSystem={(user) => {
          setCurrentUser(user);
          setShowWelcomeScreen(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        collapsed={sidebarCollapsed}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <Header
          searchTerm={searchTerm}
          setSearchTerm={handleHeaderSearch}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          notifications={realNotifications}
          unreadNotificationsCount={unreadNotificationsCount}
          onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
          onNotificationClick={handleNotificationClick}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Dashboard Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <>
              {/* Greeting Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-medium tracking-tight text-slate-900 flex items-center gap-2">
                    <span>Olá, {currentUser?.name || 'Administrador'}</span>
                    <span className="text-xl">👋</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Bem-vindo ao SIGEC - Sistema Integrado de Gestão de Contratos.
                  </p>
                </div>
              </div>


              {/* Key Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <MetricCard
                  title="Contratos Ativos"
                  value={String(activeContractsCount)}
                  icon={FileText}
                  variant="green"
                  onClick={() => setActiveTab('contratos-lancados')}
                />
                <MetricCard
                  title="Contratos a Vencer"
                  value={String(expiringContractsCount)}
                  icon={Clock}
                  variant="amber"
                  onClick={() => setActiveTab('controle-contratos')}
                />
                <MetricCard
                  title="Entregas de Ordens"
                  value={String(purchaseOrdersAlertCount)}
                  icon={ShoppingCart}
                  variant="blue"
                  onClick={() => setActiveTab('ordens-compra')}
                />
              </div>

              <div className="bg-rose-50 rounded-2xl border border-rose-200 shadow-2xs p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-3">
                  <div>
                    <h3 className="text-sm font-medium text-rose-800">
                      Contratos a Vencer
                    </h3>
                    <p className="text-xs text-rose-700/80 mt-0.5">
                      Monitoramento dos contratos nos últimos 60 dias de vigência
                    </p>
                  </div>
                  <span className="text-xs font-medium text-rose-700 bg-white/70 border border-rose-100 px-2 py-0.5 rounded-full">
                    {expiringContracts60Days.length} contrato(s)
                  </span>
                </div>

                {expiringContracts60Days.length === 0 ? (
                  <div className="py-5 text-center">
                    <p className="font-medium text-rose-700 text-xs">Nenhum contrato nos últimos 60 dias de vigência</p>
                  </div>
                ) : (
                  <div className="divide-y divide-rose-100">
                    {expiringContracts60Days.map((c) => {
                      const daysRemaining = getDaysUntilDate(c.endDate);
                      return (
                        <button
                          key={c.id}
                          onClick={() => setActiveTab('controle-contratos')}
                          className="w-full py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-left hover:bg-rose-100/60 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-rose-950 truncate" title={c.creditor}>
                              {c.creditor}
                            </p>
                            <p className="text-xs text-rose-800/80 font-mono truncate" title={c.contractNum}>
                              Contrato {c.contractNum}
                            </p>
                          </div>
                          <span className="text-[11px] font-medium text-rose-700 bg-white/75 border border-rose-100 px-2 py-0.5 rounded-full shrink-0">
                            Vence em {daysRemaining}d
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {purchaseOrdersDeliveryAlerts.length > 0 && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-2xs p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <div>
                    <h3 className="text-sm font-medium text-amber-800">Entregas de Ordens de Compras</h3>
                    <p className="text-xs text-amber-700/80 mt-0.5">Ordens pendentes com entrega prevista para os próximos 7 dias</p>
                  </div>
                  <span className="text-xs font-medium text-amber-700 bg-white/70 border border-amber-100 px-2 py-0.5 rounded-full">
                    {purchaseOrdersDeliveryAlerts.length} alerta(s)
                  </span>
                </div>

                {purchaseOrdersDeliveryAlerts.length === 0 ? (
                  <div className="py-5 text-center">
                    <p className="font-medium text-amber-700 text-xs">Nenhuma ordem com entrega próxima</p>
                  </div>
                ) : (
                  <div className="divide-y divide-amber-100">
                    {purchaseOrdersDeliveryAlerts.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => setActiveTab('ordens-compra')}
                        className="w-full py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-left hover:bg-amber-100/60 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-amber-950 truncate" title={order.companyName}>{order.companyName}</p>
                          <p className="text-xs text-amber-800/80 font-mono truncate" title={order.orderNumber}>Ordem {order.orderNumber}</p>
                        </div>
                        <span className="text-[11px] font-medium text-amber-700 bg-white/75 border border-amber-100 px-2 py-0.5 rounded-full shrink-0">
                          {(order.daysRemaining ?? 0) < 0 ? 'Atrasada' : `Entrega em ${order.daysRemaining}d`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              )}
              {/* Vis?o de Execu??o de Saldos (Contratos Lan?ados) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">
                      Visão de Execução de Saldos & Controle de Vencimentos
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Demonstrativo do saldo disponível e prazos de vigência dos contratos
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('contratos-lancados')}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 hover:underline cursor-pointer self-start sm:self-auto"
                  >
                    <span>Ver Todos ({contracts.length})</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {contracts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-1.5">
                      <Database className="w-7 h-7 mx-auto text-slate-300" />
                      <p className="font-medium text-slate-700 text-xs">Nenhum contrato cadastrado</p>
                    </div>
                  ) : (
                    dashboardContracts.map((c) => {
                      const notesSum = notes
                        ? notes.filter((n) => n.contractNum === c.contractNum).reduce((sum, n) => sum + n.value, 0)
                        : 0;
                      const used = Math.max(c.usedValue || 0, notesSum);
                      const remaining = Math.max(0, c.totalValue - used);
                      const usagePct = c.totalValue > 0 ? Math.round((used / c.totalValue) * 100) : 0;

                      const daysRemaining = getDaysUntilDate(c.endDate);

                      // Determine Balance Alert
                      let balanceBadge = (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          Saldo OK
                        </span>
                      );
                      if (remaining <= 0 || usagePct >= 100) {
                        balanceBadge = (
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Esgotado
                          </span>
                        );
                      } else if (usagePct >= 80) {
                        balanceBadge = (
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Saldo Baixo
                          </span>
                        );
                      }

                      // Determine Expiration Alert
                      let expirationBadge = (
                        <span className="text-[11px] font-medium text-slate-500">
                          Vence: {formatBRDate(c.endDate)}
                        </span>
                      );
                      if (daysRemaining !== null && daysRemaining < 0) {
                        expirationBadge = (
                          <span className="text-[11px] font-medium text-rose-600 px-2 py-0.5">
                            Vencido ({formatBRDate(c.endDate)})
                          </span>
                        );
                      } else if (daysRemaining !== null && daysRemaining <= 60) {
                        expirationBadge = (
                          <span className="text-[11px] font-medium text-rose-600 px-2 py-0.5">
                            Vence em {daysRemaining}d
                          </span>
                        );
                      }

                      return (
                        <div
                          key={c.id}
                          className="py-3.5 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 md:w-[35%] shrink-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium text-slate-800 truncate" title={c.creditor}>
                                {c.creditor}
                              </span>
                              {balanceBadge}
                            </div>
                            <span className="text-xs text-slate-600 font-medium block truncate font-mono" title={c.contractNum}>
                              Contrato {c.contractNum}
                            </span>
                          </div>

                          <div className="md:w-[40%] space-y-1">
                            <div className="flex justify-between text-[11px] font-medium text-slate-600">
                              <span>{usagePct}% executado</span>
                              <span className="text-slate-700 font-medium">Saldo: R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300 bg-slate-500"
                                style={{ width: `${Math.min(usagePct, 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end space-x-3 md:w-[25%] shrink-0 text-right">
                            {expirationBadge}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'contratos-lancados' && (
            <>
              {/* Header and Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-medium tracking-tight text-slate-900">
                    Contratos Lançados
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Visualize o demonstrativo completo de execução e acompanhe limites de cada contrato.
                  </p>
                </div>
              </div>

              {/* Full Contract Table Component */}
              <div className="w-full">
                <ContractTable
                  contracts={filteredContracts}
                  notes={notes}
                  amendments={amendments}
                  onOpenNewContractModal={() => {
                    setEditingContract(null);
                    setActiveTab('lancar-contrato');
                  }}
                  onViewContractDetails={(contract) => setSelectedContractDetail(contract)}
                  onEditContract={(contract) => {
                    setEditingContract(contract);
                    setActiveTab('lancar-contrato');
                  }}
                  onDeleteContract={handleDeleteContract}
                  onAddAmendment={handleAddAmendment}
                  onViewAllContracts={() => setActiveTab('contratos-lancados')}
                  canViewDocuments={canViewDocuments}
                />
              </div>
            </>
          )}

          {activeTab === 'controle-contratos' && (
            <ContractControlView
              contracts={filteredContracts}
              notes={notes}
            />
          )}

          {activeTab === 'lancar-contrato' && (
            <NewContractView
              editingContract={editingContract}
              onAddContract={handleAddContract}
              onUpdateContract={handleUpdateContract}
              onCancel={() => {
                setEditingContract(null);
                setActiveTab('dashboard');
              }}
              fiscais={fiscais}
              creditors={creditors}
              categories={categories}
              onAddCategory={handleAddCategory}
            canManageDocumentLinks={canViewDocuments}
            />
          )}

          {activeTab === 'fiscais' && (
            <FiscaisView
              fiscais={filteredFiscais}
              onAddFiscal={handleAddFiscal}
              onUpdateFiscal={handleUpdateFiscal}
              onDeleteFiscal={handleDeleteFiscal}
            />
          )}

          {activeTab === 'credores' && (
            <CreditorsView
              creditors={filteredCreditors}
              onAddCreditor={handleAddCreditor}
              onUpdateCreditor={handleUpdateCreditor}
              onDeleteCreditor={handleDeleteCreditor}
            />
          )}

          {activeTab === 'empenhos' && (
            <CommitmentsView
              commitments={filteredCommitments}
              notes={notes}
              creditors={creditors}
              contracts={contracts}
              onAddCommitment={handleAddCommitment}
              onUpdateCommitment={handleUpdateCommitment}
              onDeleteCommitment={handleDeleteCommitment}
            />
          )}

          {activeTab === 'notas' && (
            <InvoicesView
              notes={filteredNotes}
              contracts={contracts}
              commitments={commitments}
              creditors={creditors}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {activeTab === 'aditivos' && (
            <AmendmentsView
              amendments={filteredAmendments}
              contracts={contracts}
              onAddAmendment={handleAddAmendment}
              onUpdateAmendment={handleUpdateAmendment}
              onDeleteAmendment={handleDeleteAmendment}
              canViewDocuments={canViewDocuments}
              initialEditingAmendment={editingAmendmentFromDetails}
              onInitialEditHandled={() => setEditingAmendmentFromDetails(null)}
            />
          )}

          {activeTab === 'ordens-compra' && (
            <PurchaseOrdersView
              purchaseOrders={filteredPurchaseOrders}
              onAddPurchaseOrder={handleAddPurchaseOrder}
              onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
              onDeletePurchaseOrder={handleDeletePurchaseOrder}
              onNotifyAdministrative={handleNotifyPurchaseOrder}
            />
          )}

          {activeTab === 'notificacao-administrativa' && (
            <AdministrativeNotificationView
              purchaseOrders={purchaseOrders}
              initialOrder={administrativeNotificationOrder}
              onInitialOrderHandled={() => setAdministrativeNotificationOrder(null)}
              onRegisterGeneratedNotification={handleRegisterGeneratedNotification}
            />
          )}

          {activeTab === 'notificacoes-geradas' && (
            <GeneratedNotificationsView
              notifications={generatedAdministrativeNotifications}
              onUpdateNotification={handleUpdateGeneratedNotification}
              onDeleteNotification={handleDeleteGeneratedNotification}
            />
          )}
          {activeTab === 'relatorios' && (
            <ReportsView
              contracts={contracts}
              notes={filteredNotes}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'relatorio-fiscalizacao' && (
            <ContractFiscalizationReportsView
              contracts={contracts}
              notes={filteredNotes}
              creditors={creditors}
              fiscais={fiscais}
              amendments={amendments}
            />
          )}

          {activeTab === 'alertas' && (
            <AlertsView
              contracts={contracts}
              notes={notes}
              amendments={amendments}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'ia' && (
            <AiAssistantView
              contracts={contracts}
              creditors={creditors}
              commitments={commitments}
              notes={notes}
              onAddContract={handleAddContract}
              onAddCommitment={handleAddCommitment}
              onAddNote={handleAddNote}
              onAddCreditor={handleAddCreditor}
              onAddAlert={handleAddAiAlert}
            />
          )}
        </main>
      </div>

      {/* Security Info Modal */}
      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      {/* View Contract Details Modal */}
      {selectedContractDetail && (() => {
        const linkedNotes = notes.filter(
          (n) => n.contractNum.toLowerCase().trim() === selectedContractDetail.contractNum.toLowerCase().trim()
        );
        const linkedAmendments = amendments.filter(
          (a) => a.contractNum.toLowerCase().trim() === selectedContractDetail.contractNum.toLowerCase().trim()
        );
        const contractItems = selectedContractDetail.items || [];
        const contractItemsTotal = contractItems.reduce((sum, item) => sum + item.quantity * item.unitValue, 0);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl p-6 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-medium text-slate-800">
                    Detalhes do Contrato {selectedContractDetail.contractNum}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedContractDetail(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs overflow-y-auto pr-1 flex-1">
                <div>
                  <span className="text-slate-400 font-medium">Credor / Empresa:</span>
                  <p className="font-medium text-slate-800 text-sm mt-0.5">
                    {selectedContractDetail.creditor}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Objeto do Contrato:</span>
                  <p className="text-slate-700 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {selectedContractDetail.object}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 font-medium">Período de Vigência:</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {formatBRDate(selectedContractDetail.startDate)} a {formatBRDate(selectedContractDetail.endDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Valor Total:</span>
                    <p className="font-medium text-emerald-700 text-sm mt-0.5">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        selectedContractDetail.totalValue
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 font-medium">Status Atual:</span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedContractDetail.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Total de Notas Emitidas:</span>
                    <p className="font-medium text-slate-800 text-sm mt-1">
                      {linkedNotes.length} {linkedNotes.length === 1 ? 'Nota' : 'Notas'}
                    </p>
                  </div>
                </div>

                {canViewDocuments && (selectedContractDetail.contractLink || linkedAmendments.some((am) => am.amendmentLink)) && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-slate-500 font-medium text-xs uppercase tracking-wider">
                      Documentos
                    </span>
                    <div className="border border-slate-200/60 rounded-xl divide-y divide-slate-100 bg-slate-50/50 overflow-hidden">
                      {selectedContractDetail.contractLink && (
                        <a
                          href={getExternalUrl(selectedContractDetail.contractLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 p-2.5 text-xs bg-white hover:bg-emerald-50/60 transition-colors"
                        >
                          <span className="font-medium text-slate-800">Contrato principal</span>
                          <Link2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        </a>
                      )}
                      {linkedAmendments
                        .filter((am) => am.amendmentLink)
                        .map((am) => (
                          <a
                            key={am.id}
                            href={getExternalUrl(am.amendmentLink || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-3 p-2.5 text-xs bg-white hover:bg-emerald-50/60 transition-colors"
                          >
                            <span className="font-medium text-slate-800">{am.amendmentNum}</span>
                            <Link2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          </a>
                        ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-slate-500 font-medium text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>Itens do Contrato</span>
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {contractItems.length} {contractItems.length === 1 ? 'Item' : 'Itens'}
                    </span>
                  </span>
                  {contractItems.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                      Nenhum item cadastrado para este contrato.
                    </p>
                  ) : (
                    <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-slate-50/50">
                      <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-100">
                        {contractItems.map((item) => (
                          <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 text-xs bg-white">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate">{item.description}</p>
                              <p className="text-[10px] text-slate-500">
                                {item.quantity.toLocaleString('pt-BR')} {item.unit} x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitValue)}
                              </p>
                            </div>
                            <span className="font-medium text-slate-900 whitespace-nowrap">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unitValue)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex justify-between text-xs font-medium">
                        <span className="text-slate-500">Total dos itens</span>
                        <span className="text-emerald-700">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contractItemsTotal)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Linked Service Notes Section */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-slate-500 font-medium text-xs uppercase tracking-wider block">
                    Notas de Serviço Vinculadas
                  </span>
                  {linkedNotes.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                      Nenhuma nota fiscal ou nota de serviço vinculada a este contrato.
                    </p>
                  ) : (
                    <div className="max-h-[180px] overflow-y-auto border border-slate-200/60 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                      {linkedNotes.map((note) => (
                        <div key={note.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                              <Receipt className="w-3.5 h-3.5 text-slate-500" />
                              <span>{note.noteNumber}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Emitido em: {note.issueDate} • R$ {note.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                              note.status === 'Paga'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {note.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked Amendments Section */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-slate-500 font-medium text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>Termos Aditivos Vinculados</span>
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {linkedAmendments.length} {linkedAmendments.length === 1 ? 'Aditivo' : 'Aditivos'}
                    </span>
                  </span>
                  {linkedAmendments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                      Nenhum termo aditivo cadastrado para este contrato.
                    </p>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto border border-slate-200/60 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                      {linkedAmendments.map((am) => (
                        <div key={am.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                              <Layers className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{am.amendmentNum}</span>
                              {canViewDocuments && am.amendmentLink && (
                                <a
                                  href={getExternalUrl(am.amendmentLink)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-md text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                                  title="Abrir link do aditivo"
                                >
                                  <Link2 className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <span className="text-[10px] font-medium text-slate-500">({am.type})</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Assinatura: {am.signatureDate} {am.valueChange ? `• Impacto: R$ ${am.valueChange.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAmendmentFromDetails(am);
                                setSelectedContractDetail(null);
                                setActiveTab('aditivos');
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Editar Termo Aditivo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {am.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedContractDetail(null)}
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}



      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('sigec_user', JSON.stringify(user));
        }}
        onLogout={handleLogout}
      />
    </div>
  );
}
