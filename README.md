# RobSun — site institucional e simulador solar

Site institucional em React com simulador fotovoltaico e duas experiências publicadas em paralelo.

## Versões
- **V1 atual:** `/robsun/`
- **V2 em avaliação:** `/robsun/v2/`

A V2 é um entrypoint separado. Ela não substitui a home atual e reutiliza o mesmo modelo solar auditado em `src/solar-model.js`.

## Direção da V2
- posicionamento de engenharia e instalação, sem typewriter ou excesso de efeitos decorativos;
- layout editorial com menos cards e maior hierarquia tipográfica;
- foco em projeto, homologação, instalação e comissionamento;
- sem inventar projetos, clientes, depoimentos, números ou credenciais;
- calculadora tratada como ferramenta comercial, não como produto principal;
- formulário de contato conectado ao estado da calculadora.

## Dados enviados pelo lead
Quando o usuário leva a simulação para o formulário, o payload reúne:
- nome, WhatsApp, e-mail, cidade e observações;
- consumo e conta informados;
- cidade/CEP e UF;
- área, tipo de cobertura, orientação e sombreamento;
- crescimento previsto e folga de dimensionamento;
- potência e quantidade de módulos;
- potência total em kWp;
- geração mensal projetada;
- área útil estimada e compatibilidade da área;
- economia e conta residual estimadas;
- faixa indicativa de investimento e payback;
- premissas técnicas usadas no cálculo.

O transporte do lead é configurável pelo meta `robsun-lead-endpoint` em `v2/index.html`. Sem endpoint configurado, a prévia não apresenta sucesso falso: o payload é preservado na sessão e a interface informa que o envio real ainda precisa ser conectado.

## Modelo solar
O dimensionamento está centralizado em `src/solar-model.js` e considera, entre outros fatores:
- recurso solar conservador por UF para pré-análise;
- consumo projetado e folga opcional;
- orientação, sombreamento, inclinação e perdas;
- potência dos módulos e área de layout por tipo de cobertura;
- autoconsumo, compensação, custo de disponibilidade e transição do Fio B;
- encargos fixos não compensáveis quando informados.

A localização exata e a fatura real devem ser utilizadas na proposta técnica definitiva.

## Referências técnicas
- INPE/LABREN — Atlas Brasileiro de Energia Solar
- CRESESB SunData
- NREL PVWatts
- ANEEL — Micro e Minigeração Distribuída
- Lei 14.300/2022
- Radar Solfácil para referência indicativa de preço instalado

## Qualidade e deploy
O GitHub Actions executa antes da publicação:
- testes do modelo solar;
- smoke tests da V1;
- smoke tests da V2;
- build multi-page do Vite;
- regressão Playwright mobile e desktop para V1 e V2;
- deploy no GitHub Pages apenas depois da aprovação dessas etapas.

As simulações são orientativas e devem ser validadas por vistoria e projeto executivo.
