import React, { useState } from 'react';
import { Bot, ExternalLink, RefreshCw } from 'lucide-react';

const AI_URL =
  'https://use.ai/pt/a7c43580-ea1f-4e10-a21a-b31cc02738d2?id=YmluZ3xjcGN8QUlfQlJfUFRfQ2hhdF9EU0tfU0VBX0xMTV9DbGF1ZGV8NTI0MDkyMTg2fGNsYXVkZXx8fDEzMjM4MTQ4MTI1NzMxOTR8QUlfQlJfUFRfQ2xhdWRlX0V4YWN0fHx8fHx8fHx8fDk4Yjc0N2IwZmMzODEzMWMyNzRlMmRkODZhMzVkOGJkfA';

export const AiAssistantView: React.FC = () => {
  const [iframeKey, setIframeKey] = useState(0);

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] min-h-[640px] flex flex-col">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">IA</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Faça login e use a conversa da IA dentro do painel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIframeKey((key) => key + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recarregar</span>
          </button>
          <a
            href={AI_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir em nova aba</span>
          </a>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <iframe
          key={iframeKey}
          src={AI_URL}
          title="IA"
          className="w-full h-full border-0"
          allow="clipboard-read; clipboard-write; microphone; camera"
        />
      </div>
    </div>
  );
};
