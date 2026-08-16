# RobSun — simulador solar interativo

Site institucional mobile-first com calculadora fotovoltaica 100% front-end.

## Experiência da calculadora
- fluxo guiado em 4 etapas;
- estado inicial neutro antes do cliente informar o consumo;
- telhado animado com módulos adicionados/removidos em tempo real;
- consumo atual e previsão de aumento futuro;
- estado/região solar, área útil e tipo de cobertura;
- orientação predominante e sombreamento;
- meta de compensação;
- potência do módulo e perdas do sistema;
- alerta quando o telhado não comporta a quantidade recomendada;
- potência, geração, área, economia, investimento e payback indicativos;
- cena solar mobile refinada com bússola simples e posicionamento estável do telhado;
- animações React/Motion orientadas à interação e respeitando reduced motion;
- testes Playwright em 320 px, 393 px, 430 px e desktop antes do deploy.

## Modelo simplificado

`Geração mensal ≈ kWp × HSP × 30 × (1 - perdas) × orientação × sombra`

Premissas importantes:
- HSP é uma aproximação regional, não uma consulta solarimétrica por coordenadas;
- perdas padrão de 14%;
- área aproximada por módulo conforme a potência selecionada;
- investimento é apenas uma faixa indicativa e não constitui orçamento;
- economia considera premissas simplificadas de autoconsumo, compensação e custo residual da unidade.

## Referências
- Google Project Sunroof: https://sunroof.withgoogle.com/
- NREL PVWatts: https://pvwatts.nrel.gov/
- CRESESB SunData: https://www.cresesb.cepel.br/index.php?section=sundata

A simulação é orientativa e deve ser validada por vistoria e projeto executivo.
