import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AnimatePresence,
  LayoutGroup,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import logo from '../assets/logo-robsun.svg'
import './app-v6.css'

const TYPEWRITER_PHRASES = [
  'ganhar forma.',
  'reduzir seus custos.',
  'gerar sua própria energia.',
  'trabalhar por você todos os dias.',
]

const STATE_REGION = {
  SP:'SE', RJ:'SE', MG:'SE', ES:'SE', PR:'S', SC:'S', RS:'S', DF:'CO', GO:'CO', MT:'CO', MS:'CO',
  BA:'NE', PE:'NE', CE:'NE', RN:'NE', PB:'NE', AL:'NE', SE:'NE', PI:'NE', MA:'NE',
  AM:'N', PA:'N', AC:'N', RO:'N', RR:'N', AP:'N', TO:'N',
}
const HSP = { NE:5.5, CO:5.2, SE:5.1, N:4.6, S:4.4 }
const OPTIMAL_TILT = { NE:10, CO:15, SE:20, N:8, S:25 }
const ORIENTATION_FACTOR = { N:1, NE:.96, E:.90, S:.78 }
const SHADE_FACTOR = { none:1, light:.95, medium:.86, high:.72 }
const ORIENTATION_LABEL = { N:'Norte', NE:'NE / NO', E:'Leste / Oeste', S:'Sul' }
const SHADE_LABEL = { none:'Nenhuma', light:'Leve', medium:'Média', high:'Alta' }
const COMPASS_ANGLE = { N:0, NE:45, E:90, S:180 }
const ROOF_ROTATION = { N:-18, NE:-10, E:0, S:16 }
const PANEL_AREA = { 550:2.55, 585:2.58, 610:2.62, 700:3.10 }
const CONNECTION_KWH = { mono:30, bi:50, tri:100 }
const MARKET_REFERENCE_BRL_PER_WP = 2.45
const DEFAULT_FIO_B_SHARE = 28

const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits:0 })
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 })
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
const brl0 = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 })

const UF_NAMES = {
  SP:'São Paulo', RJ:'Rio de Janeiro', MG:'Minas Gerais', ES:'Espírito Santo', PR:'Paraná', SC:'Santa Catarina', RS:'Rio Grande do Sul', DF:'Distrito Federal', GO:'Goiás', MT:'Mato Grosso', MS:'Mato Grosso do Sul', BA:'Bahia', PE:'Pernambuco', CE:'Ceará', RN:'Rio Grande do Norte', PB:'Paraíba', AL:'Alagoas', SE:'Sergipe', PI:'Piauí', MA:'Maranhão', AM:'Amazonas', PA:'Pará', AC:'Acre', RO:'Rondônia', RR:'Roraima', AP:'Amapá', TO:'Tocantins',
}

function compactBrl(value) {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 })} mil`
  return brl0.format(value)
}

function marketRange(installedKw) {
  const center = MARKET_REFERENCE_BRL_PER_WP * (installedKw <= 3 ? 1.08 : installedKw >= 8 ? .94 : 1)
  return { low:center * .86, high:center * 1.20 }
}

function calculateSolar(values) {
  const consumption = Math.max(50, Number(values.consumption) || 500)
  const bill = Math.max(0, Number(values.bill) || 0)
  const futureConsumption = consumption * (1 + values.future / 100)
  const targetFraction = values.coverage / 100
  const region = STATE_REGION[values.state] || 'SE'
  const solarResource = HSP[region]
  const optimalTilt = OPTIMAL_TILT[region]
  const tiltDelta = Math.abs(values.tilt - optimalTilt)
  const tiltFactor = Math.max(.92, 1 - Math.min(.08, tiltDelta * .0015))
  const loss = values.losses / 100
  const effectiveSun = solarResource * ORIENTATION_FACTOR[values.orientation] * SHADE_FACTOR[values.shade] * tiltFactor
  const targetGeneration = futureConsumption * targetFraction
  const rawRequiredKw = targetGeneration / (effectiveSun * 30 * (1 - loss))
  const panels = Math.max(1, Math.ceil(rawRequiredKw * 1000 / values.panelPower))
  const installedKw = panels * values.panelPower / 1000
  const monthlyGeneration = installedKw * effectiveSun * 30 * (1 - loss)
  const moduleArea = panels * (PANEL_AREA[values.panelPower] || 2.6)
  const roofArea = Math.max(1, Number(values.roofArea) || 40)
  const fits = moduleArea <= roofArea
  const coverage = Math.min(monthlyGeneration / futureConsumption * 100, 150)

  const apparentTariff = consumption ? bill / consumption : 0
  const compensatedEnergy = Math.min(monthlyGeneration, futureConsumption)
  const selfConsumedEnergy = compensatedEnergy * (values.selfConsumption / 100)
  const exportedEnergy = Math.max(0, compensatedEnergy - selfConsumedEnergy)
  const grossAvoidedCost = compensatedEnergy * apparentTariff
  const fioBCharge = values.gdRule === 'new2026'
    ? exportedEnergy * apparentTariff * (values.fioBShare / 100) * .60
    : 0
  const availabilityCost = apparentTariff * CONNECTION_KWH[values.connection]
  const estimatedBillAfterSolar = Math.max(availabilityCost, bill - grossAvoidedCost + fioBCharge)
  const netMonthlySavings = Math.max(0, bill - estimatedBillAfterSolar)
  const annualSavings = netMonthlySavings * 12

  const price = marketRange(installedKw)
  const investmentLow = installedKw * 1000 * price.low
  const investmentHigh = installedKw * 1000 * price.high

  return {
    consumption, futureConsumption, region, solarResource, optimalTilt, tiltFactor, effectiveSun,
    panels, installedKw, monthlyGeneration, moduleArea, roofArea, fits, coverage, targetFraction,
    apparentTariff, compensatedEnergy, selfConsumedEnergy, exportedEnergy, grossAvoidedCost,
    fioBCharge, availabilityCost, estimatedBillAfterSolar, netMonthlySavings,
    investmentLow, investmentHigh,
    paybackLow: annualSavings ? investmentLow / annualSavings : 0,
    paybackHigh: annualSavings ? investmentHigh / annualSavings : 0,
  }
}

function useMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const listener = event => setMobile(event.matches)
    listener(media)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])
  return mobile
}

function parseFormattedInteger(input, max = 999999) {
  const digits = String(input ?? '').replace(/\D/g, '')
  if (!digits) return 0
  return Math.min(max, Number(digits))
}

function formatEditableInteger(value) {
  const numeric = Number(value) || 0
  return numeric > 0 ? nf0.format(Math.round(numeric)) : ''
}

function FormattedIntegerInput({ id, value, onChange, min = 0, max = 999999, ariaLabel }) {
  return <input
    id={id}
    className="formatted-number"
    type="text"
    inputMode="numeric"
    autoComplete="off"
    enterKeyHint="next"
    aria-label={ariaLabel}
    value={formatEditableInteger(value)}
    onChange={event => onChange(parseFormattedInteger(event.target.value, max))}
    onBlur={() => { if (value > 0 && value < min) onChange(min) }}
  />
}

function AnimatedNumber({ value, format = valueToFormat => nf0.format(valueToFormat) }) {
  const reduced = useReducedMotion()
  const raw = useMotionValue(value)
  const spring = useSpring(raw, { stiffness:165, damping:27, mass:.72 })
  const [display, setDisplay] = useState(format(value))
  useEffect(() => {
    if (reduced) setDisplay(format(value))
    else raw.set(value)
  }, [value, reduced, raw, format])
  useMotionValueEvent(spring, 'change', latest => setDisplay(format(latest)))
  return <>{display}</>
}

function Typewriter() {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [cursor, setCursor] = useState(1)
  const [deleting, setDeleting] = useState(false)
  const phrase = TYPEWRITER_PHRASES[phraseIndex]
  const visibleText = phrase.slice(0, Math.max(1, cursor))

  useEffect(() => {
    const atEnd = cursor >= phrase.length
    const atStart = cursor <= 1
    const delay = deleting ? (atStart ? 130 : 38) : (atEnd ? 1450 : 64)
    const timer = window.setTimeout(() => {
      if (deleting) {
        if (atStart) {
          const nextIndex = (phraseIndex + 1) % TYPEWRITER_PHRASES.length
          setPhraseIndex(nextIndex)
          setCursor(1)
          setDeleting(false)
        } else {
          setCursor(value => Math.max(1, value - 1))
        }
      } else if (atEnd) {
        setDeleting(true)
      } else {
        setCursor(value => Math.min(phrase.length, value + 1))
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [cursor, deleting, phrase, phraseIndex])

  return <span className="type-line" aria-label={`Veja seu projeto solar ${phrase}`}><span id="typewriter" aria-hidden="true">{visibleText}</span><m.span className="caret" aria-hidden="true" animate={{ opacity:[1,1,0,0,1] }} transition={{ duration:.92, repeat:Infinity, times:[0,.42,.5,.92,1] }} /></span>
}

function Reveal({ children, className = '', delay = 0, as = 'div', id }) {
  const Component = m[as]
  const reduced = useReducedMotion()
  return <Component id={id} className={className} initial={reduced ? false : { opacity:0, y:18 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true, amount:.14 }} transition={{ duration:.48, delay, ease:[.16,1,.3,1] }}>{children}</Component>
}

function Header() {
  const [open, setOpen] = useState(false)
  const links = [['#simulador','Calculadora'],['#incluido','O projeto'],['#solucoes','Soluções'],['#processo','Como funciona'],['#faq','Dúvidas']]
  return <header className="site-header" id="top">
    <div className="shell header-inner">
      <a className="brand" href="#top" aria-label="RobSun, início"><img src={logo} alt="RobSun — elétrica e energia solar" /></a>
      <nav className="desktop-nav" aria-label="Navegação principal">{links.map(([href,label]) => <a key={href} href={href}>{label}</a>)}</nav>
      <m.a whileTap={{ scale:.98 }} whileHover={{ y:-1 }} className="header-cta" href="#contato">Solicitar projeto</m.a>
      <button className={`menu-button ${open ? 'active' : ''}`} type="button" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><span></span><span></span></button>
    </div>
    <AnimatePresence initial={false}>{open && <m.nav className="mobile-menu" id="mobileMenu" initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}>
      {links.map(([href,label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
      <a className="menu-cta" href="#contato" onClick={() => setOpen(false)}>Solicitar meu projeto</a>
    </m.nav>}</AnimatePresence>
  </header>
}

function Hero() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target:ref, offset:['start start','end start'] })
  const glowY = useTransform(scrollYProgress, [0,1], [0, reduced ? 0 : 45])
  return <section className="hero" ref={ref}>
    <m.div className="hero-glow" style={{ y:glowY }} aria-hidden="true" />
    <Reveal className="shell hero-content">
      <span className="eyebrow"><i></i> Projetos e instalação de energia solar</span>
      <h1>Veja seu projeto solar <Typewriter /></h1>
      <p>Da análise do consumo à instalação, a RobSun desenvolve seu projeto fotovoltaico com dimensionamento, homologação e execução sob medida.</p>
      <div className="hero-actions"><m.a whileTap={{ scale:.98 }} whileHover={{ y:-2 }} className="btn btn-primary btn-lg" href="#contato">Quero meu projeto solar <span>→</span></m.a><m.a whileTap={{ scale:.98 }} className="btn btn-secondary btn-lg" href="#simulador">Simular meu sistema</m.a></div>
      <div className="hero-trust"><span><b>✓</b> Projeto sob medida</span><span><b>✓</b> Homologação e instalação</span><span><b>✓</b> Acompanhamento técnico</span></div>
    </Reveal>
  </section>
}

function TrustStrip() {
  return <section className="trust-strip"><div className="shell trust-grid"><article><strong>Projeto completo</strong><span>do dimensionamento ao comissionamento</span></article><article><strong>Decisão com clareza</strong><span>premissas visíveis antes da proposta</span></article><article><strong>Instalação planejada</strong><span>solução compatível com imóvel e consumo</span></article></div></section>
}

function ChoiceGroup({ id, value, options, onChange }) {
  return <LayoutGroup id={id}><div className="choice-group" id={id}>{options.map(([option,label]) => {
    const selected = value === option
    return <m.button whileTap={{ scale:.97 }} type="button" key={String(option)} className={selected ? 'selected' : ''} onClick={() => onChange(option)}>{selected && <m.span className="choice-active" layoutId={`${id}-active`} transition={{ type:'spring', stiffness:420, damping:34 }} />}<span>{label}</span></m.button>
  })}</div></LayoutGroup>
}

function SolarRoofScene({ values, model, compact = false }) {
  const reduced = useReducedMotion()
  const visiblePanels = Math.min(model.panels, compact ? 12 : 24)
  const columns = Math.max(2, Math.min(compact ? 4 : 6, Math.ceil(Math.sqrt(Math.max(visiblePanels,1) * 1.45))))
  const hidden = Math.max(0, model.panels - visiblePanels)
  return <div className={`solar-scene ${compact ? 'solar-scene-compact' : ''}`} data-panels={model.panels} data-orientation={values.orientation}>
    <m.div className="scene-sun" animate={reduced ? undefined : { scale:[1,1.035,1] }} transition={{ duration:4.8, repeat:Infinity, ease:'easeInOut' }} />
    <div className="scene-rays" />
    <div className="compass" aria-label={`Orientação do telhado: ${ORIENTATION_LABEL[values.orientation]}`}>
  <div className="compass-ring" aria-hidden="true"><span className="compass-n">N</span><span className="compass-e">E</span><span className="compass-s">S</span><span className="compass-o">O</span><m.div className="compass-ticks" animate={{ rotate:COMPASS_ANGLE[values.orientation] * .18 }} transition={{ type:'spring', stiffness:170, damping:22 }} /></div>
  <m.div className="compass-needle" animate={{ rotate:COMPASS_ANGLE[values.orientation] }} transition={{ type:'spring', stiffness:230, damping:24, mass:.65 }} aria-hidden="true"><i className="needle-north" /><i className="needle-south" /></m.div>
  <div className="compass-center" aria-hidden="true"><span /></div>
  <m.span className="compass-heading" key={values.orientation} initial={{ opacity:0, y:3 }} animate={{ opacity:1, y:0 }} transition={{ duration:.22 }}>{ORIENTATION_LABEL[values.orientation]}</m.span>
</div>
    <m.div className="roof-positioner" animate={{ y:[0,-2,0] }} transition={reduced ? undefined : { duration:5.2, repeat:Infinity, ease:'easeInOut' }} style={{ '--roof-rotation':`${ROOF_ROTATION[values.orientation]}deg` }}>
      <m.div className="roof-scaler" animate={{ scale:model.fits ? 1 : .985 }} transition={{ type:'spring', stiffness:150, damping:24 }}>
        <div className="roof-surface">
          <div className="roof-texture" />
          <LayoutGroup id={compact ? 'mobile-array' : 'desktop-array'}><m.div className="panel-grid" layout style={{ '--cols':columns }}><AnimatePresence mode="popLayout" initial={false}>{Array.from({ length:visiblePanels }, (_, index) => <m.i layout="position" key={`panel-${index}`} className="solar-panel" initial={reduced ? false : { opacity:0, y:14, scale:.84 }} animate={{ opacity:1, y:0, scale:1 }} exit={reduced ? undefined : { opacity:0, y:-8, scale:.78 }} transition={{ layout:{ type:'spring', stiffness:310, damping:29 }, default:{ type:'spring', stiffness:290, damping:24, delay:Math.min(index*.012,.13) } }}><span className="panel-cells" /><m.span className="panel-glint" animate={reduced ? undefined : { x:['-28%','28%','-28%'] }} transition={reduced ? undefined : { duration:3.8, repeat:Infinity, ease:'easeInOut', delay:Math.min(index*.09,.7) }} /></m.i>)}</AnimatePresence></m.div></LayoutGroup>
          <div className="roof-sheen" />
        </div>
      </m.div>
    </m.div>
    <m.div className="scene-shade" animate={{ opacity:{ none:0, light:.10, medium:.22, high:.38 }[values.shade], x:{ none:55, light:28, medium:8, high:-8 }[values.shade] }} transition={{ type:'spring', stiffness:115, damping:24 }} />
    {!compact && <svg className="energy-flow" viewBox="0 0 700 220" preserveAspectRatio="none" aria-hidden="true"><path className="energy-base" d="M100 175 C250 150 400 202 590 120"/><m.path className="energy-live" d="M100 175 C250 150 400 202 590 120" initial={{ pathLength:0, opacity:0 }} animate={reduced ? { pathLength:1, opacity:.7 } : { pathLength:[0,.7,1], opacity:[0,.9,0] }} transition={reduced ? { duration:.2 } : { duration:2.8, repeat:Infinity, ease:'easeInOut' }}/></svg>}
    <AnimatePresence>{hidden > 0 && <m.span className="panel-overflow" initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>{`+${hidden} módulos`}</m.span>}</AnimatePresence>
  </div>
}

function CompactMetrics({ model }) {
  return <div className="compact-metrics"><span><small>Sistema</small><strong><AnimatedNumber value={model.installedKw} format={value => `${nf2.format(value)} kWp`} /></strong></span><span><small>Módulos</small><strong><AnimatedNumber value={model.panels} format={value => nf0.format(Math.round(value))} /></strong></span><span><small>Geração</small><strong><AnimatedNumber value={model.monthlyGeneration} format={value => `${nf0.format(value)} kWh`} /></strong></span></div>
}

function FinancialAssumptions({ values, patch }) {
  return <details className="advanced-details"><summary>Detalhes técnicos e financeiros</summary><div className="advanced-grid">
    <div className="field"><label htmlFor="tilt">Inclinação aproximada</label><div className="range-head"><span>Plano dos módulos</span><strong>{values.tilt}°</strong></div><input id="tilt" type="range" min="0" max="45" step="1" value={values.tilt} onChange={event => patch({ tilt:Number(event.target.value) })} /></div>
    <div className="field"><label htmlFor="panelPower">Potência do módulo</label><select id="panelPower" value={values.panelPower} onChange={event => patch({ panelPower:Number(event.target.value) })}>{[550,585,610,700].map(w => <option key={w} value={w}>{w} W</option>)}</select></div>
    <div className="field"><label htmlFor="losses">Perdas do sistema</label><div className="range-head"><span>Estimativa total</span><strong>{values.losses}%</strong></div><input id="losses" type="range" min="8" max="22" value={values.losses} onChange={event => patch({ losses:Number(event.target.value) })} /></div>
    <div className="field"><label htmlFor="connection">Ligação da unidade</label><select id="connection" value={values.connection} onChange={event => patch({ connection:event.target.value })}><option value="mono">Monofásica</option><option value="bi">Bifásica</option><option value="tri">Trifásica</option></select></div>
    <div className="field"><label htmlFor="gdRule">Regra de compensação</label><select id="gdRule" value={values.gdRule} onChange={event => patch({ gdRule:event.target.value })}><option value="new2026">Novo sistema em 2026</option><option value="legacy">Direito adquirido / regra anterior</option></select></div>
    <div className="field"><label htmlFor="selfConsumption">Autoconsumo instantâneo</label><div className="range-head"><span>Energia usada enquanto é gerada</span><strong>{values.selfConsumption}%</strong></div><input id="selfConsumption" type="range" min="10" max="70" value={values.selfConsumption} onChange={event => patch({ selfConsumption:Number(event.target.value) })} /></div>
    <div className="field"><label htmlFor="fioBShare">Parcela estimada do Fio B</label><div className="range-head"><span>Proxy da tarifa total</span><strong>{values.fioBShare}%</strong></div><input id="fioBShare" type="range" min="15" max="40" value={values.fioBShare} onChange={event => patch({ fioBShare:Number(event.target.value) })} /></div>
  </div><p className="advanced-note">Os parâmetros regulatórios e tarifários variam por distribuidora e unidade consumidora. A proposta técnica deve usar a fatura real para confirmar a economia.</p></details>
}

function ResultCard({ values, model, compact = false }) {
  return <div className={`result-card ${compact ? 'result-card-mobile' : ''}`}>
    <div className="result-hero"><span>Potência instalada estimada</span><strong><AnimatedNumber value={model.installedKw} format={value => nf2.format(value)} /> <small>kWp</small></strong><p>Meta de geração: {Math.round(model.targetFraction*100)}% do consumo projetado</p></div>
    <div className="result-grid">
      <article><span>Módulos</span><strong>{nf0.format(model.panels)}</strong><small>{values.panelPower} W por módulo</small></article>
      <article><span>Geração mensal</span><strong>{nf0.format(model.monthlyGeneration)} kWh</strong></article>
      <article><span>Área mínima dos módulos</span><strong>{nf1.format(model.moduleArea)} m²</strong></article>
      <article className="result-highlight"><span>Economia líquida estimada</span><strong>{brl0.format(model.netMonthlySavings)}/mês</strong><small>após premissas simplificadas de compensação</small></article>
      <article><span>Conta residual estimada</span><strong>{brl0.format(model.estimatedBillAfterSolar)}/mês</strong></article>
      <article><span>Investimento indicativo</span><strong>{compactBrl(model.investmentLow)} – {compactBrl(model.investmentHigh)}</strong></article>
      <article><span>Payback simples</span><strong>{model.paybackLow ? `${model.paybackLow.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} – ${model.paybackHigh.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} anos` : '—'}</strong></article>
      <article><span>Área disponível</span><strong className={model.fits ? '' : 'warning-text'}>{model.fits ? 'Compatível' : `Faltam ≈ ${nf1.format(model.moduleArea-model.roofArea)} m²`}</strong></article>
    </div>
    <div className="regulatory-note"><strong>Como tratamos 2026</strong><p>Para novos sistemas, a simulação considera uma aproximação da transição da Lei 14.300, custo de disponibilidade do Grupo B e autoconsumo instantâneo. É uma pré-análise — a economia final depende da tarifa e do enquadramento da sua unidade.</p></div>
  </div>
}

function SolarCalculator() {
  const mobile = useMobile()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [error, setError] = useState('')
  const [values, setValues] = useState({
    consumption:500, bill:550, future:0, cityCep:'', state:'SP', roofArea:40, roofType:'ceramic',
    orientation:'N', shade:'none', coverage:95, panelPower:585, tilt:20, losses:14,
    connection:'bi', gdRule:'new2026', selfConsumption:30, fioBShare:DEFAULT_FIO_B_SHARE,
  })
  const model = useMemo(() => calculateSolar(values), [values])
  const patch = update => setValues(current => ({ ...current, ...update }))
  const next = () => {
    if (step===1 && (values.consumption<50 || values.bill<50)) return setError('Informe consumo e valor médio da conta para continuar.')
    if (step===2 && values.roofArea<8) return setError('Informe uma área útil aproximada a partir de 8 m².')
    setError(''); setDirection(1); setStep(current => Math.min(4,current+1))
  }
  const back = () => { setError(''); setDirection(-1); setStep(current => Math.max(1,current-1)) }

  const headings = [
    ['01','Consumo','Quanto você usa de energia?'],
    ['02','Imóvel','Onde o sistema será instalado?'],
    ['03','Exposição solar','Como o telhado recebe sol?'],
    ['04','Refinamento','Ajuste a pré-análise'],
  ]

  const fields = {
    1:<><div className="field"><label htmlFor="consumption">Consumo médio mensal</label><p>Use a média dos últimos meses da sua conta.</p><div className="input-group"><FormattedIntegerInput id="consumption" value={values.consumption} min={50} max={20000} ariaLabel="Consumo médio mensal em kWh" onChange={consumption=>patch({consumption})}/><span>kWh/mês</span></div></div><div className="field"><label htmlFor="bill">Valor médio da conta</label><p>Usado para estimar economia e payback.</p><div className="input-group money"><span>R$</span><FormattedIntegerInput id="bill" value={values.bill} min={50} max={50000} ariaLabel="Valor médio mensal da conta em reais" onChange={bill=>patch({bill})}/><small>/mês</small></div></div><div className="field"><label>Prevê aumento de consumo?</label><ChoiceGroup id="futureLoadGroup" value={values.future} options={[[0,'Não'],[10,'+10%'],[20,'+20%'],[30,'+30%']]} onChange={future=>patch({future})}/></div></>,
    2:<><div className="field"><label htmlFor="cityCep">Cidade ou CEP</label><p>Ajuda a preparar a avaliação técnica. A pré-simulação usa a referência solar do estado.</p><input id="cityCep" type="text" placeholder="Ex.: Santo André ou 09000-000" value={values.cityCep} onChange={event=>patch({cityCep:event.target.value})}/></div><div className="field"><label htmlFor="state">Estado</label><select id="state" value={values.state} onChange={event=>patch({state:event.target.value})}>{Object.keys(UF_NAMES).map(uf=><option key={uf} value={uf}>{UF_NAMES[uf]}</option>)}</select></div><div className="field two-fields"><div><label htmlFor="roofArea">Área útil para módulos</label><div className="input-group"><FormattedIntegerInput id="roofArea" value={values.roofArea} min={8} max={5000} ariaLabel="Área útil para módulos em metros quadrados" onChange={roofArea=>patch({roofArea})}/><span>m²</span></div></div><div><label htmlFor="roofType">Tipo de cobertura</label><select id="roofType" value={values.roofType} onChange={event=>patch({roofType:event.target.value})}><option value="ceramic">Telha cerâmica</option><option value="metal">Metálica</option><option value="fiber">Fibrocimento</option><option value="slab">Laje</option><option value="other">Outro</option></select></div></div></>,
    3:<><div className="field"><label>Orientação predominante</label><ChoiceGroup id="orientationGroup" value={values.orientation} options={[["N","Norte"],["NE","NE / NO"],["E","Leste / Oeste"],["S","Sul"]]} onChange={orientation=>patch({orientation})}/></div><div className="field"><label>Sombreamento</label><ChoiceGroup id="shadeGroup" value={values.shade} options={[["none","Nenhum"],["light","Leve"],["medium","Médio"],["high","Alto"]]} onChange={shade=>patch({shade})}/></div><div className="field"><div className="range-head"><label htmlFor="coverage">Quanto do consumo você quer gerar?</label><strong>{values.coverage}%</strong></div><input id="coverage" type="range" min="50" max="100" value={values.coverage} onChange={event=>patch({coverage:Number(event.target.value)})}/></div></>,
    4:<><p className="step-intro">Com os padrões abaixo já conseguimos uma boa pré-análise. Abra os detalhes se souber mais sobre o imóvel e a tarifa.</p><FinancialAssumptions values={values} patch={patch}/><div className="tip-box"><strong>O projeto executivo vem depois</strong><p>Inclinação real, sombras, estrutura, padrão elétrico, equipamentos e regras da distribuidora são confirmados na avaliação técnica.</p></div></>,
  }

  const [number,label,title] = headings[step-1]
  return <section className="section simulator-section" id="simulador">
    <Reveal className="shell section-head"><span className="section-kicker">Calculadora solar</span><h2>Entenda o potencial antes de pedir a proposta</h2><p>Uma pré-análise transparente para estimar sistema, área, geração e economia sem confundir simulação com projeto executivo.</p></Reveal>
    <div className="shell simulator-grid">
      <m.div className="wizard-card" layout>
        <div className="wizard-head"><div><span>Etapa</span><strong>{step} de 4</strong></div><LayoutGroup id="steps"><div className="wizard-dots">{[1,2,3,4].map(item=><m.i layout key={item} className={`step-dot ${item===step?'active':''} ${item<step?'done':''}`}>{item===step&&<m.span layoutId="active-step" className="step-ring"/>}</m.i>)}</div></LayoutGroup></div>
        <form id="solarForm" onSubmit={event=>event.preventDefault()}>
          <AnimatePresence mode="popLayout" initial={false} custom={direction}><m.section key={step} className="wizard-step" custom={direction} variants={{enter:dir=>({opacity:0,x:dir*18}),center:{opacity:1,x:0},exit:dir=>({opacity:0,x:dir*-14})}} initial="enter" animate="center" exit="exit" transition={{duration:.24,ease:[.2,.8,.2,1]}}>
            <div className="step-heading"><span>{number}</span><div><small>{label}</small><h3>{title}</h3></div></div>
            {mobile && <div className="mobile-calculator-scene"><SolarRoofScene values={values} model={model} compact/><CompactMetrics model={model}/></div>}
            {fields[step]}
            <AnimatePresence>{error&&<m.p className="form-error" initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>{error}</m.p>}</AnimatePresence>
            <div className={`step-actions ${step===1?'solo':''}`}>{step>1&&<m.button whileTap={{scale:.98}} className="btn btn-secondary" type="button" onClick={back}>Voltar</m.button>}{step<4?<m.button whileTap={{scale:.98}} className="btn btn-primary" type="button" onClick={next}>Continuar <span>→</span></m.button>:<m.a whileTap={{scale:.98}} className="btn btn-primary" href="#contato">Solicitar projeto</m.a>}</div>
          </m.section></AnimatePresence>
        </form>
        {mobile && <ResultCard values={values} model={model} compact/>}
      </m.div>

      {!mobile && <aside className="preview-card desktop-preview"><div className="preview-top"><div><span>Pré-visualização</span><strong>Arranjo estimado dos módulos</strong></div><span className="live-badge"><i/> ao vivo</span></div><SolarRoofScene values={values} model={model}/><div className="scene-meta"><div><span>Orientação</span><strong>{ORIENTATION_LABEL[values.orientation]}</strong></div><div><span>Sombra</span><strong>{SHADE_LABEL[values.shade]}</strong></div><div><span>Recurso solar</span><strong>≈ {nf1.format(model.solarResource)} kWh/m²/dia</strong></div></div><CompactMetrics model={model}/><div className="area-meter"><div><span>Ocupação mínima</span><strong>{nf1.format(model.moduleArea)} / {nf1.format(model.roofArea)} m²</strong></div><div className="meter-track"><m.i animate={{width:`${Math.min(100,model.moduleArea/model.roofArea*100)}%`}} transition={{type:'spring',stiffness:140,damping:24}} className={model.fits?'':'meter-danger'}/></div></div><ResultCard values={values} model={model}/></aside>}
    </div>
  </section>
}

function ProjectIncluded() {
  const included = ['Análise do consumo e objetivo do cliente','Dimensionamento do sistema fotovoltaico','Definição do arranjo e equipamentos','Projeto elétrico e documentação aplicável','Homologação junto à distribuidora','Estrutura de fixação e instalação','Proteções elétricas e comissionamento','Orientação para acompanhar o sistema']
  return <section className="section included-section" id="incluido"><div className="shell included-layout"><Reveal className="included-copy"><span className="section-kicker">Projeto completo</span><h2>O que está incluído na jornada RobSun</h2><p>A calculadora é só o começo. O valor está em transformar a estimativa em um sistema executável, documentado e compatível com o imóvel.</p><a className="text-link" href="#contato">Quero avaliar meu imóvel <span>→</span></a></Reveal><div className="included-list">{included.map((item,index)=><Reveal key={item} className="included-item" delay={index*.035}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong></Reveal>)}</div></div></section>
}

function Solutions() {
  return <section className="section soft" id="solucoes"><div className="shell editorial-layout"><Reveal className="editorial-copy"><span className="section-kicker">Soluções</span><h2>Energia solar para residências e empresas</h2><p>O mesmo rigor de projeto, adaptado ao perfil de consumo e à realidade de cada instalação.</p></Reveal><div className="solution-columns"><Reveal className="solution-panel"><span>Residencial</span><h3>Menos exposição à conta de energia</h3><p>Dimensionamento considerando consumo atual, crescimento previsto, área útil e características do telhado.</p><ul><li>Casas e condomínios</li><li>Planejamento de expansão de consumo</li><li>Projeto e instalação integrados</li></ul></Reveal><Reveal className="solution-panel" delay={.08}><span>Comercial</span><h3>Mais previsibilidade para a operação</h3><p>Projetos para negócios que precisam avaliar economia, disponibilidade de área e viabilidade técnica antes de investir.</p><ul><li>Comércios e escritórios</li><li>Perfis de consumo maiores</li><li>Documentação e comissionamento</li></ul></Reveal></div></div></section>
}

function Process() {
  const ref=useRef(null); const reduced=useReducedMotion(); const {scrollYProgress}=useScroll({target:ref,offset:['start 75%','end 40%']})
  const items=[['01','Diagnóstico','Consumo, localização, objetivo e características iniciais.'],['02','Projeto','Dimensionamento, arranjo, equipamentos e documentação.'],['03','Homologação','Processo aplicável junto à distribuidora.'],['04','Instalação','Execução elétrica e mecânica conforme projeto.'],['05','Comissionamento','Verificação final e orientação para acompanhamento.']]
  return <section className="section process-section" id="processo" ref={ref}><Reveal className="shell section-head"><span className="section-kicker">Como funciona</span><h2>Da primeira conversa ao sistema em operação</h2></Reveal><div className="shell process-wrap"><div className="process-rail"><m.i style={{scaleY:reduced?1:scrollYProgress,transformOrigin:'top'}}/></div><div className="process-list">{items.map(([n,t,p],i)=><Reveal key={t} className="process-row" delay={i*.04}><span>{n}</span><div><h3>{t}</h3><p>{p}</p></div></Reveal>)}</div></div></section>
}

function WhyRobSun() {
  return <section className="section dark" id="diferenciais"><div className="shell dark-layout"><Reveal><span className="section-kicker light">Por que RobSun</span><h2>Simples para o cliente. Rigoroso onde precisa ser técnico.</h2><p>Preferimos mostrar premissas, limites e próximos passos com clareza em vez de prometer precisão que uma calculadora online não pode entregar.</p></Reveal><div className="principles"><Reveal as="article"><strong>Dimensionamento responsável</strong><p>A estimativa não é apresentada como projeto executivo.</p></Reveal><Reveal as="article" delay={.05}><strong>Premissas transparentes</strong><p>Geração, área e economia mostram de onde vêm os principais números.</p></Reveal><Reveal as="article" delay={.1}><strong>Execução integrada</strong><p>Projeto, homologação, instalação e comissionamento na mesma jornada.</p></Reveal></div></div></section>
}

function FAQ() {
  const items=[['A calculadora já é um orçamento?','Não. Ela é uma pré-análise. O orçamento definitivo depende da avaliação técnica, equipamentos, estrutura, elétrica, logística e regras da distribuidora.'],['A economia mostrada é garantida?','Não. A simulação usa premissas simplificadas de tarifa, autoconsumo, custo de disponibilidade e compensação. A proposta final deve usar a fatura real e o enquadramento da unidade.'],['A RobSun cuida da homologação?','O projeto completo contempla a documentação e o processo de homologação aplicável ao sistema contratado.'],['O sistema elimina totalmente a conta?','Não necessariamente. Em baixa tensão podem permanecer custo de disponibilidade, encargos e outras parcelas conforme a tarifa e as regras aplicáveis.'],['É possível instalar em empresa?','Sim. O projeto é dimensionado de acordo com o perfil de consumo e as condições elétricas, estruturais e operacionais do local.']]
  return <section className="section" id="faq"><Reveal className="shell section-head"><span className="section-kicker">Dúvidas frequentes</span><h2>O que vale saber antes de contratar</h2></Reveal><div className="shell faq-list">{items.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
}

function Contact() {
  const [sent,setSent]=useState(false)
  return <section className="section contact-section" id="contato"><Reveal className="shell contact-card"><div><span className="section-kicker">Próximo passo</span><h2>Vamos transformar a estimativa em um projeto real?</h2><p>Envie seus dados para a RobSun avaliar o próximo passo da instalação.</p><div className="contact-points"><span>✓ Avaliação do cenário</span><span>✓ Dimensionamento técnico</span><span>✓ Próximos passos claros</span></div></div><form onSubmit={event=>{event.preventDefault();if(event.currentTarget.reportValidity())setSent(true)}}><label><span>Seu nome</span><input type="text" required autoComplete="name" placeholder="Como podemos te chamar?"/></label><label><span>WhatsApp</span><input type="tel" required autoComplete="tel" placeholder="(11) 99999-9999"/></label><label><span>E-mail</span><input type="email" required autoComplete="email" placeholder="voce@exemplo.com"/></label><m.button whileTap={{scale:.98}} className="btn btn-primary" type="submit">{sent?'Solicitação registrada ✓':'Solicitar avaliação'}</m.button>{sent&&<small className="form-success">Solicitação registrada com sucesso.</small>}</form></Reveal></section>
}

function Footer(){return <footer><div className="shell footer-main"><div><img src={logo} alt="RobSun"/><p>Projetos e instalação de energia solar com clareza, planejamento e acompanhamento técnico.</p></div><nav><a href="#simulador">Calculadora</a><a href="#incluido">O projeto</a><a href="#processo">Como funciona</a><a href="#faq">Dúvidas</a></nav></div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} RobSun</span><span>Simulações são estimativas orientativas.</span></div></footer>}

function App(){return <MotionConfig reducedMotion="user" transition={{ease:[.16,1,.3,1]}}><Header/><main><Hero/><TrustStrip/><SolarCalculator/><ProjectIncluded/><Solutions/><Process/><WhyRobSun/><FAQ/><Contact/></main><Footer/></MotionConfig>}

createRoot(document.getElementById('root')).render(<LazyMotion features={domAnimation} strict><App/></LazyMotion>)
