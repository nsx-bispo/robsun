# RobSun — simulador solar interativo

Site institucional mobile-first com calculadora fotovoltaica 100% front-end.

## Experiência da calculadora
- fluxo guiado em 4 etapas;
- telhado animado com módulos adicionados/removidos em tempo real;
- consumo atual e previsão de aumento futuro;
- estado/região solar, área útil e tipo de cobertura;
- orientação predominante e sombreamento;
- meta de compensação;
- potência do módulo e perdas do sistema;
- alerta quando o telhado não comporta a quantidade recomendada;
- potência, geração mensal/anual, área, economia, investimento e payback indicativos.

## Modelo simplificado

`Geração mensal ≈ kWp × HSP × 30 × (1 - perdas) × orientação × sombra`

Premissas importantes:
- HSP é uma aproximação regional, não uma consulta solarimétrica por coordenadas;
- perdas padrão de 14%, seguindo a referência inicial exibida pelo PVWatts;
- área aproximada de 2,6 m² por módulo, incluindo margem simples de ocupação;
- investimento é apenas uma faixa indicativa e não constitui orçamento;
- economia considera uma margem conservadora para custos residuais/fixos.

## Referências
- Google Project Sunroof: https://sunroof.withgoogle.com/
- NREL PVWatts: https://pvwatts.nrel.gov/
- CRESESB SunData: https://www.cresesb.cepel.br/index.php?section=sundata

A simulação é orientativa e deve ser validada por vistoria e projeto executivo.
