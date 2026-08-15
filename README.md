# RobSun — Site mobile-first de Energia Solar

Landing page profissional e responsiva com calculadora solar, desenvolvida em HTML, CSS e JavaScript puro.

## Foco de UX
- Mobile-first, com referência de largura para iPhone 14 Pro (~393 px).
- Controles de toque confortáveis (48–56 px).
- CTA fixo no rodapé em dispositivos móveis, respeitando `safe-area-inset-bottom` do iPhone.
- Calculadora em 2 etapas para reduzir carga cognitiva.
- Resultados organizados por prioridade: potência → painéis/geração → área/economia/investimento/payback.
- Menu mobile compacto, tipografia responsiva e ausência de scroll horizontal.
- Suporte a `prefers-reduced-motion`.

## Arquivos
- `index.html` — estrutura e conteúdo.
- `styles.css` — design system, layout mobile-first e breakpoints.
- `script.js` — calculadora, fluxo de etapas, menu e interações.

## Premissas atuais da calculadora
- consumo médio mensal informado em kWh;
- região brasileira como aproximação de horas de sol pico;
- módulos de 550 W, 585 W ou 610 W;
- performance ratio de 80%;
- área aproximada de 2,55 m² por módulo;
- investimento indicativo de R$ 3.600 a R$ 5.000 por kWp;
- economia limitada a 90% da conta como margem conservadora.

A simulação é orientativa e não substitui vistoria e projeto técnico.

## Antes de produção
1. Trocar WhatsApp, e-mail e demais contatos pelos dados reais da RobSun.
2. Integrar o formulário com CRM, WhatsApp, e-mail ou backend.
3. Ajustar custos por kWp para a operação real da empresa.
4. Definir área de atendimento.
5. Incluir política de privacidade/LGPD.
6. Para maior precisão, substituir região por CEP/cidade e usar dados solarimétricos reais.
