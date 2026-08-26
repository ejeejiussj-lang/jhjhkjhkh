import React, { useMemo } from 'react';
import { BellRing, CalendarClock, CheckCircle2, Clock, FileWarning, Trash2, XCircle } from 'lucide-react';
import { GeneratedAdministrativeNotification } from '../types';
import { formatBRDate, parseBRDate } from '../utils/dateFormat';

interface GeneratedNotificationsViewProps {
  notifications: GeneratedAdministrativeNotification[];
  onUpdateNotification: (notification: GeneratedAdministrativeNotification) => void;
  onDeleteNotification: (id: string) => void;
}

const getDaysUntil = (dateText: string) => {
  const target = parseBRDate(dateText);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getStatusStyle = (status: GeneratedAdministrativeNotification['status']) => {
  if (status === 'Concluido') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Sem resposta') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const getDeadlineText = (notification: GeneratedAdministrativeNotification) => {
  if (notification.status === 'Concluido') return 'Concluido';
  if (notification.status === 'Sem resposta') return 'Prazo vencido sem resposta';

  const days = getDaysUntil(notification.responseDeadline);
  if (days === null) return 'Prazo invalido';
  if (days < 0) return 'Vencida';
  if (days === 0) return 'Vence hoje';
  return `Vence em ${days} dia(s)`;
};

export const GeneratedNotificationsView: React.FC<GeneratedNotificationsViewProps> = ({
  notifications,
  onUpdateNotification,
  onDeleteNotification
}) => {
  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => {
      const aDate = parseBRDate(a.responseDeadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDate = parseBRDate(b.responseDeadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (a.status === 'Pendente' && b.status !== 'Pendente') return -1;
      if (a.status !== 'Pendente' && b.status === 'Pendente') return 1;
      return aDate - bDate;
    }),
    [notifications]
  );

  const pendingCount = notifications.filter((item) => item.status === 'Pendente').length;
  const noResponseCount = notifications.filter((item) => item.status === 'Sem resposta').length;
  const doneCount = notifications.filter((item) => item.status === 'Concluido').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight flex items-center space-x-2.5">
            <BellRing className="w-7 h-7 text-emerald-600" />
            <span>Notificacoes Enviadas</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Acompanhamento dos prazos de resposta das notificacoes administrativas emitidas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium uppercase text-slate-500">Pendentes</p>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium uppercase text-slate-500">Sem resposta</p>
          <p className="text-2xl font-semibold text-rose-700 mt-1">{noResponseCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium uppercase text-slate-500">Concluidas</p>
          <p className="text-2xl font-semibold text-emerald-700 mt-1">{doneCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-medium uppercase text-slate-600 tracking-wider">
                <th className="py-3.5 px-4">Empresa</th>
                <th className="py-3.5 px-4">Ordem</th>
                <th className="py-3.5 px-4">Emissao</th>
                <th className="py-3.5 px-4">Prazo de resposta</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedNotifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileWarning className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700 text-xs">Nenhuma notificacao gerada.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Gere um PDF na tela de Notificacao Administrativa para iniciar o acompanhamento.</p>
                  </td>
                </tr>
              ) : sortedNotifications.map((notification) => (
                <tr key={notification.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-900">{notification.companyName || 'Empresa nao informada'}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{notification.cnpj || 'CNPJ nao informado'}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{notification.orderNumber || '-'}</td>
                  <td className="py-3.5 px-4 text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatBRDate(notification.sentDate)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                      {formatBRDate(notification.responseDeadline)}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">{getDeadlineText(notification)}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ' + getStatusStyle(notification.status)}>
                      {notification.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {notification.status !== 'Concluido' && (
                      <button
                        onClick={() => onUpdateNotification({ ...notification, status: 'Concluido' })}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Marcar como concluido"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {notification.status === 'Pendente' && (
                      <button
                        onClick={() => onUpdateNotification({ ...notification, status: 'Sem resposta' })}
                        className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Marcar sem resposta"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteNotification(notification.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};