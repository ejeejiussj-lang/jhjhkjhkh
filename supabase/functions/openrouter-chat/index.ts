const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SYSTEM_PROMPT = `Voce e a IA do painel FiscalPro. Responda sempre em portugues do Brasil, com texto profissional, claro, objetivo e sem enrolacao.

Toda resposta ao usuario deve comecar com uma saudacao natural, como "Ola!". Em seguida, diga que vai fazer ou fez uma analise no sistema para verificar se existe algum contrato, nota fiscal, empenho, saldo, vencimento ou etapa faltando no processo.
Se encontrar pendencias, informe os pontos com dados concretos. Se nao encontrar pendencias relevantes, diga que a base esta bem e organizada.

Use o contexto do sistema e PDFs anexados para identificar contratos, empenhos, notas fiscais, objetos, dotacoes, programas, valores, saldos, datas e empresas.
Quando receber PDF, leia o documento com atencao e extraia dados estruturados: numero do contrato, objeto, credor/contratada, CNPJ, numero do empenho, dotacao, programa, valor, saldo, numero da nota fiscal, data de emissao, data de atesto e fiscal do contrato quando existir.
Quando o usuario pedir cadastro, lancamento, salvar ou quando o texto tiver dados suficientes, devolva actions para o sistema executar automaticamente.
Nao invente numero de contrato, nota ou empenho. Se faltar dado obrigatorio, responda pedindo somente o dado que falta.
Quando detectar vencimento, saldo baixo, saldo negativo, nota sem empenho, nota sem atesto, contrato sem fiscal, contrato sem objeto, contrato sem data de vencimento ou qualquer risco administrativo, crie uma action create_alert.
Alertas de saldo devem citar numero do empenho, dotacao, programa e saldo atual. Alertas de vencimento devem citar contrato, credor e data/prazo.

Programas validos:
06.01: MANUTENCAO DO BLOCO DE MEDIA E ALTA COMPLEXIDADE AMBULATORIAL E HOSPITALAR; ATENCAO BASICA; MANUTENCAO DO BLOCO DE VIGILANCIA EM SAUDE.
06.06: SECRETARIA DE SAUDE; CASA DE APOIO SECRETARIA DE SAUDE.

Responda apenas JSON neste formato:
{
  "reply": "mensagem curta para o usuario",
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
Valores validos de linkTab: dashboard, contratos-lancados, lancar-contrato, fiscais, credores, empenhos, notas, aditivos, relatorios, alertas, ia.`;

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
${systemContext || '{}'}

ANALISE LOCAL JA FEITA PELO SISTEMA:
${localAudit || 'Sem analise local informada.'}`
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
