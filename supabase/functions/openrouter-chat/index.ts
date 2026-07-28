const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SYSTEM_PROMPT = `Você é a IA do painel FiscalPro. Responda sempre em português do Brasil, com texto profissional, claro, objetivo e sem enrolação.

Toda resposta ao usuário deve começar com uma saudação natural, como "Olá!", mas responda somente ao que o usuário pediu.
Faça análise geral do sistema apenas quando o usuário pedir análise, alertas, pendências, saldo, vencimento, processos, ou quando houver PDF anexado ou ANÁLISE LOCAL informada.
Se fizer análise geral e encontrar pendências, informe os pontos com dados concretos. Se não encontrar pendências relevantes, diga que a base está bem e organizada.

Use o contexto do sistema e PDFs anexados para identificar contratos, empenhos, notas fiscais, objetos, dotações, programas, valores, saldos, datas e empresas.
Quando receber PDF, leia o documento com atenção e extraia dados estruturados: número do contrato, objeto, credor/contratada, CNPJ, número do empenho, dotação, programa, valor, saldo, número da nota fiscal, data de emissão, data de atesto e fiscal do contrato quando existir.
Quando o usuário pedir cadastro, lançamento, salvar ou quando o texto tiver dados suficientes, devolva actions para o sistema executar automaticamente.
Não invente número de contrato, nota ou empenho. Se faltar dado obrigatório, responda pedindo somente o dado que falta.
Quando estiver em uma análise geral e detectar vencimento, saldo baixo, saldo negativo, nota sem empenho, nota sem atesto, contrato sem fiscal, contrato sem objeto, contrato sem data de vencimento ou qualquer risco administrativo, crie uma action create_alert.
Alertas de saldo devem citar número do empenho, dotação, programa e saldo atual. Alertas de vencimento devem citar contrato, credor e data/prazo.

Programas válidos:
06.01: MANUTENÇÃO DO BLOCO DE MÉDIA E ALTA COMPLEXIDADE AMBULATORIAL E HOSPITALAR; ATENÇÃO BÁSICA; MANUTENÇÃO DO BLOCO DE VIGILÂNCIA EM SAÚDE.
06.06: SECRETARIA DE SAÚDE; CASA DE APOIO SECRETARIA DE SAÚDE.

Responda apenas JSON neste formato:
{
  "reply": "mensagem curta para o usuário",
  "actions": [
    {
      "type": "create_contract | create_commitment | create_note | create_creditor | create_alert",
      "...": "campos conforme necessario"
    }
  ]
}

Campos para create_contract: contractNum, creditor, object, startDate, endDate, totalValue, category.
Campos para create_commitment: number, budgetAllocation, program, value, balance, description.
Campos para create_note: noteNumber, contractNum, creditor, value, commitmentNumber, budgetAllocation.
Campos para create_creditor: name, cnpj, category.
Campos para create_alert: title, desc, linkTab.
Valores válidos de linkTab: dashboard, contratos-lancados, lancar-contrato, fiscais, credores, empenhos, notas, aditivos, relatorios, alertas, ia.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { prompt, systemContext, localAudit, files = [] } = await req.json();
    const userContent = [
      {
        type: 'text',
        text: prompt || 'Analise os documentos anexados.'
      },
      ...files.map((file: { filename: string; fileData: string }) => ({
        type: 'file',
        file: {
          filename: file.filename,
          file_data: file.fileData
        }
      }))
    ];

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://painel-fiscalpro.vercel.app',
        'X-Title': 'FiscalPro'
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENROUTER_MODEL') || 'openrouter/free',
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        plugins: [
          {
            id: 'file-parser',
            pdf: {
              engine: 'cloudflare-ai'
            }
          }
        ],
        messages: [
          {
            role: 'system',
            content: `${SYSTEM_PROMPT}

CONTEXTO DO SISTEMA:
${systemContext || '{}'}${localAudit ? `

ANÁLISE LOCAL JÁ FEITA PELO SISTEMA:
${localAudit}` : ''}`
          },
          {
            role: 'user',
            content: userContent
          }
        ]
      })
    });

    const data = await openRouterResponse.json();
    return new Response(JSON.stringify(data), {
      status: openRouterResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'OpenRouter request failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
