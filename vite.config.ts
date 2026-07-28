import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'gemini-chat-api',
        configureServer(server) {
          server.middlewares.use('/api/gemini-chat', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method not allowed');
              return;
            }

            const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }));
              return;
            }

            let rawBody = '';
            req.on('data', (chunk) => {
              rawBody += chunk;
            });
            req.on('end', async () => {
              try {
                const { prompt, systemContext } = JSON.parse(rawBody || '{}');
                const geminiResponse = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 900,
                        responseMimeType: 'application/json'
                      },
                      contents: [
                        {
                          role: 'user',
                          parts: [
                            {
                              text: `Voce e a IA do painel FiscalPro. Responda sempre em portugues do Brasil, direto e sem enrolacao.

Use o contexto do sistema para identificar contratos, empenhos, notas fiscais, objetos, dotacoes, programas, valores e saldos.
Quando o usuario pedir cadastro, lancamento, salvar ou quando o texto tiver dados suficientes, devolva actions para o sistema executar automaticamente.
Nao invente numero de contrato, nota ou empenho. Se faltar dado obrigatorio, responda pedindo somente o dado que falta.

Programas validos:
06.01: MANUTENCAO DO BLOCO DE MEDIA E ALTA COMPLEXIDADE AMBULATORIAL E HOSPITALAR; ATENCAO BASICA; MANUTENCAO DO BLOCO DE VIGILANCIA EM SAUDE.
06.06: SECRETARIA DE SAUDE; CASA DE APOIO SECRETARIA DE SAUDE.

Responda apenas JSON neste formato:
{
  "reply": "mensagem curta para o usuario",
  "actions": [
    {
      "type": "create_contract | create_commitment | create_note | create_creditor",
      "...": "campos conforme necessario"
    }
  ]
}

Campos para create_contract: contractNum, creditor, object, startDate, endDate, totalValue, category.
Campos para create_commitment: number, budgetAllocation, program, value, balance, description.
Campos para create_note: noteNumber, contractNum, creditor, value, commitmentNumber, budgetAllocation.
Campos para create_creditor: name, cnpj, category.

CONTEXTO DO SISTEMA:
${systemContext}

MENSAGEM DO USUARIO:
${prompt}`
                            }
                          ]
                        }
                      ]
                    })
                  }
                );

                const data = await geminiResponse.json();
                res.statusCode = geminiResponse.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } catch (error) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Gemini request failed' }));
              }
            });
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
