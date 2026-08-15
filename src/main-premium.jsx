import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import logo from '../assets/logo-robsun.svg'
import '../v5.min.css'
import './premium-motion.css'

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
const ORIENTATION_FACTOR = { N:1, NE:.96, E:.90, S:.78 }
const SHADE_FACTOR = { none:1, light:.95, medium:.86, high:.72 }
const ORIENTATION_LABEL = { N:'Norte', NE:'NE / NO', E:'Leste / Oeste', S:'Sul' }
const SHADE_LABEL = { none:'Nenhuma', light:'Leve', medium:'Média', high:'Alta' }
const COMPASS_ANGLE = { N:0, NE:45, E:90, S:180 }
const ROOF_ROTATION = { N:-21, NE:-10, E:2, S:18 }
const SHADE_OPACITY = { none:0, light:.10, medium:.22, high:.38 }
const SHADE_X = { none:70, light:34, medium:12, high:-8 }
const PANEL_AREA = { 550:2.55, 585:2.58, 610:2.62, 700:3.10 }
const MARKET_REFERENCE_BRL_PER_WP = 2.45

const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits:0 })
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 })
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
const brl0 = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 })

function compactBrl(value) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 })} mil`
  }
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
  const sun = HSP[region]
  const loss = values.losses / 100
  const panelW = Number(values.panelPower)
  const effectiveSun = sun * ORIENTATION_FACTOR[values.orientation] * SHADE_FACTOR[values.shade]
  const targetGeneration = futureConsumption * targetFraction
  const rawRequiredKw = targetGeneration / (effectiveSun * 30 * (1 - loss))
  const panels = Math.max(1, Math.ceil(rawRequiredKw * 1000 / panelW))
  const installedKw = panels * panelW / 1000
  const monthlyGeneration = installedKw * effectiveSun * 30 * (1 - loss)
  const moduleArea = panels * (PANEL_AREA[panelW] || 2.6)
  const roofArea = Math.max(1, Number(values.roofArea) || 40)
  const fits = moduleArea <= roofArea
  const coverage = Math.min(monthlyGeneration / futureConsumption * 100, 150)
  const apparentTariff = consumption ? bill / consumption : 0
  const monthlySavings = Math.min(monthlyGeneration, futureConsumption) * apparentTariff
  const annualSavings = monthlySavings * 12
  const price = marketRange(installedKw)
  const investmentLow = installedKw * 1000 * price.low
  const investmentHigh = installedKw * 1000 * price.high

  return {
    sun, panelW, panels, installedKw, monthlyGeneration, moduleArea, roofArea, fits, coverage,
    targetFraction, monthlySavings, investmentLow, investmentHigh,
    paybackLow: annualSavings ? investmentLow / annualSavings : 0,
    paybackHigh: annualSavings ? investmentHigh / annualSavings : 0,
  }
}

function AnimatedNumber({ value, format = v => nf0.format(v), className }) {
  const reduced = useReducedMotion()
  const motionValue = useMotionValue(value)
  const spring = useSpring(motionValue, { stiffness:170, damping:26, mass:.72 })
  const [display, setDisplay] = useState(format(value))

  useEffect(() => {
    if (reduced) setDisplay(format(value))
    else motionValue.set(value)
  }, [value, reduced, motionValue, format])

  useMotionValueEvent(spring, 'change', latest => setDisplay(format(latest)))
  return <span className={className}>{display}</span>
}

function Typewriter() {
  const reduced = useReducedMotion()
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [text, setText] = useState(TYPEWRITER_PHRASES[0])
  const [phase, setPhase] = useState('pause')
  const [cursor, setCursor] = useState(TYPEWRITER_PHRASES[0].length)

  useEffect(() => {
    if (reduced) {
      setText(TYPEWRITER_PHRASES[0])
      return undefined
    }

    let delay = 60
    if (phase === 'pause') delay = 1450
    if (phase === 'gap') delay = 260
    if (phase === 'deleting') delay = 24 + (cursor % 3) * 8
    if (phase === 'typing') delay = 42 + (cursor % 4) * 9

    const timer = window.setTimeout(() => {
      const phrase = TYPEWRITER_PHRASES[phraseIndex]
      if (phase === 'pause') {
        setPhase('deleting')
        return
      }
      if (phase === 'deleting') {
        const next = Math.max(0, cursor - 1)
        setCursor(next)
        setText(phrase.slice(0, next))
        if (next === 0) {
          setPhraseIndex(index => (index + 1) % TYPEWRITER_PHRASES.length)
          setPhase('gap')
        }
        return
      }
      if (phase === 'gap') {
        setCursor(0)
        setText('')
        setPhase('typing')
        return
      }
      const nextPhrase = TYPEWRITER_PHRASES[phraseIndex]
      const next = Math.min(nextPhrase.length, cursor + 1)
      setCursor(next)
      setText(nextPhrase.slice(0, next))
      if (next === nextPhrase.length) setPhase('pause')
    }, delay)

    return () => window.clearTimeout(timer)
  }, [phraseIndex, cursor, phase, reduced])

  return (
    <span className="type-line">
      <span id="typewriter">{text}</span>
      <motion.span
        className="caret"
        aria-hidden="true"
        animate={reduced ? { opacity:1 } : { opacity:[1, 1, 0, 0, 1] }}
        transition={{ duration:1.05, repeat:Infinity, times:[0,.42,.48,.92,1], ease:'linear' }}
      />
    </span>
  )
}

function Reveal({ children, className = '', delay = 0, as = 'div', id }) {
  const Tag = motion[as]
  const reduced = useReducedMotion()
  return (
    <Tag
      id={id}
      className={className}
      initial={reduced ? false : { opacity:0, y:20, scale:.992 }}
      whileInView={{ opacity:1, y:0, scale:1 }}
      viewport={{ once:true, amount:.14 }}
      transition={{ duration:.52, delay, ease:[.16,1,.3,1] }}
    >
      {children}
    </Tag>
  )
}

function RollingLink({ href, children, className = '', primary = false }) {
  return (
    <motion.a
      href={href}
      className={`${className} rolling-cta ${primary ? 'rolling-cta-primary' : ''}`}
      whileTap={{ scale:.975 }}
      whileHover="hover"
      initial="rest"
      animate="rest"
    >
      <span className="rolling-window">
        <motion.span className="rolling-track" variants={{ rest:{ y:'0%' }, hover:{ y:'-50%' } }} transition={{ type:'spring', stiffness:320, damping:28 }}>
          <span>{children}</span>
          <span aria-hidden="true">{children}</span>
        </motion.span>
      </span>
    </motion.a>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const links = [
    ['#simulador','Calculadora'], ['#solucoes','Soluções'], ['#processo','Como funciona'], ['#diferenciais','Por que RobSun'], ['#faq','Dúvidas'],
  ]
  return (
    <header className="site-header" id="top">
      <div className="shell header-inner">
        <a className="brand" href="#top" aria-label="RobSun, início"><img src={logo} alt="RobSun — elétrica e energia solar" /></a>
        <nav className="desktop-nav" aria-label="Navegação principal">
          {links.map(([href,label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <RollingLink className="header-cta" href="#contato">Solicitar projeto</RollingLink>
        <button className={`menu-button ${open ? 'active' : ''}`} type="button" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><span></span><span></span></button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            className="mobile-menu open"
            id="mobileMenu"
            aria-label="Menu mobile"
            initial={{ opacity:0, height:0 }}
            animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }}
            transition={{ duration:.24, ease:[.2,.8,.2,1] }}
          >
            {links.map(([href,label], index) => (
              <motion.a key={href} href={href} onClick={() => setOpen(false)} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:index * .025 }}>
                {label === 'Calculadora' ? 'Calculadora solar' : label}
              </motion.a>
            ))}
            <a className="menu-cta" href="#contato" onClick={() => setOpen(false)}>Solicitar meu projeto</a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

function Hero() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target:ref, offset:['start start','end start'] })
  const orbY = useTransform(scrollYProgress, [0,1], [0, reduced ? 0 : 54])
  const orbX = useTransform(scrollYProgress, [0,1], [0, reduced ? 0 : -24])
  const haloScale = useTransform(scrollYProgress, [0,1], [1, 1.12])

  return (
    <section className="hero premium-hero" ref={ref}>
      <motion.div className="hero-light hero-light-a" style={{ y:orbY, x:orbX, scale:haloScale }} aria-hidden="true" />
      <motion.div className="hero-light hero-light-b" style={{ y:orbY }} aria-hidden="true" />
      <Reveal className="shell hero-content">
        <span className="eyebrow"><i></i> Projetos e instalação de energia solar</span>
        <h1>Veja seu projeto solar <Typewriter /></h1>
        <p>Da análise do consumo à instalação, a RobSun desenvolve seu projeto fotovoltaico com dimensionamento, homologação e execução sob medida.</p>
        <div className="hero-actions">
          <RollingLink primary className="btn btn-primary btn-lg" href="#contato">Quero meu projeto solar <span>→</span></RollingLink>
          <motion.a whileTap={{ scale:.975 }} whileHover={{ y:-2 }} className="btn btn-secondary btn-lg" href="#simulador">Simular meu sistema</motion.a>
        </div>
        <div className="hero-trust">
          {['Projeto sob medida','Homologação e instalação','Acompanhamento técnico'].map((item, index) => (
            <motion.span key={item} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.28 + index*.08, duration:.35 }}><b>✓</b> {item}</motion.span>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

function TrustStrip() {
  return (
    <section className="trust-strip">
      <div className="shell trust-grid">
        <article><strong>Projeto completo</strong><span>do dimensionamento ao comissionamento</span></article>
        <article><strong>Decisão com clareza</strong><span>estimativas antes da proposta definitiva</span></article>
        <article><strong>Instalação planejada</strong><span>solução compatível com o imóvel e o consumo</span></article>
      </div>
    </section>
  )
}

function ChoiceGroup({ id, value, options, onChange }) {
  return (
    <LayoutGroup id={id}>
      <div className="choice-group premium-choice" id={id}>
        {options.map(([option,label]) => {
          const selected = value === option
          return (
            <motion.button
              type="button"
              key={String(option)}
              className={selected ? 'selected' : ''}
              onClick={() => onChange(option)}
              whileTap={{ scale:.965 }}
            >
              {selected && <motion.span className="choice-active-bg" layoutId={`${id}-active`} transition={{ type:'spring', stiffness:430, damping:34 }} />}
              <span className="choice-label">{label}</span>
            </motion.button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

function SolarEnergyScene({ values, model, reduced }) {
  const stageRef = useRef(null)
  const { scrollYProgress } = useScroll({ target:stageRef, offset:['start end','end start'] })
  const sunY = useTransform(scrollYProgress, [0,1], [reduced ? 0 : 14, reduced ? 0 : -18])
  const sunX = useTransform(scrollYProgress, [0,1], [reduced ? 0 : 8, reduced ? 0 : -6])
  const glowOpacity = useTransform(scrollYProgress, [0,.45,1], [.52,.86,.58])
  const visiblePanels = Math.min(model.panels, 24)
  const cols = Math.max(2, Math.min(6, Math.ceil(Math.sqrt(Math.max(visiblePanels, 1) * 1.45))))
  const hiddenPanels = Math.max(0, model.panels - 24)

  return (
    <motion.div className="roof-stage premium-roof-stage" id="roofStage" ref={stageRef}>
      <motion.div className="sun-orb premium-sun" style={{ y:sunY, x:sunX }} animate={reduced ? undefined : { scale:[1,1.035,1] }} transition={{ duration:4.6, repeat:Infinity, ease:'easeInOut' }} />
      <motion.div className="sun-wash premium-sun-wash" style={{ opacity:glowOpacity }} />
      <motion.div className="solar-ray ray-a" animate={reduced ? undefined : { opacity:[.18,.42,.18], x:[-4,5,-4] }} transition={{ duration:5.2, repeat:Infinity, ease:'easeInOut' }} />
      <motion.div className="solar-ray ray-b" animate={reduced ? undefined : { opacity:[.10,.3,.10], x:[3,-5,3] }} transition={{ duration:6.1, repeat:Infinity, ease:'easeInOut' }} />

      <div className="compass premium-compass"><span>N</span><motion.i id="compassArrow" animate={{ rotate:COMPASS_ANGLE[values.orientation] }} transition={{ type:'spring', stiffness:210, damping:22 }} /></div>

      <motion.div
        className="roof-shell premium-roof-shell"
        id="roofShell"
        style={{ '--roof-rotation': `${ROOF_ROTATION[values.orientation]}deg` }}
        animate={{ scale:model.fits ? 1 : .982 }}
        transition={{ type:'spring', stiffness:150, damping:24 }}
      >
        <div className="roof-texture"></div>
        <LayoutGroup id="solar-array">
          <motion.div className="panel-grid premium-panel-grid" id="panelGrid" layout style={{ '--cols':cols }}>
            <AnimatePresence mode="popLayout" initial={false}>
              {Array.from({ length:visiblePanels }, (_, index) => (
                <motion.i
                  layout="position"
                  key={`panel-${index}`}
                  className="solar-panel premium-panel"
                  style={{ animation:'none' }}
                  initial={reduced ? false : { opacity:0, y:20, scale:.82, rotateX:14, filter:'blur(2px)' }}
                  animate={{ opacity:1, y:0, scale:1, rotateX:0, filter:'blur(0px)' }}
                  exit={reduced ? undefined : { opacity:0, y:-10, scale:.76, filter:'blur(2px)' }}
                  transition={{
                    opacity:{ duration:.18 },
                    filter:{ duration:.16 },
                    layout:{ type:'spring', stiffness:310, damping:29, mass:.72 },
                    default:{ type:'spring', stiffness:300, damping:24, delay:Math.min(index*.014,.16) },
                  }}
                  whileHover={reduced ? undefined : { y:-2, scale:1.025, transition:{ duration:.15 } }}
                >
                  <span className="panel-cell-grid" />
                  <span className="panel-glint" />
                </motion.i>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
        <div className="roof-sheen"></div>
      </motion.div>

      <motion.div
        className="shade-overlay premium-shade"
        animate={{ opacity:SHADE_OPACITY[values.shade], x:SHADE_X[values.shade] }}
        transition={{ type:'spring', stiffness:120, damping:24 }}
      />

      <svg className="energy-flow-svg" viewBox="0 0 700 240" preserveAspectRatio="none" aria-hidden="true">
        <path className="energy-flow-base" d="M115 185 C250 165 380 205 565 130" />
        <motion.path
          className="energy-flow-live"
          d="M115 185 C250 165 380 205 565 130"
          initial={{ pathLength:0, opacity:0 }}
          animate={reduced ? { pathLength:1, opacity:.7 } : { pathLength:[0,.72,1], pathOffset:[0,.12,.22], opacity:[0,.95,0] }}
          transition={reduced ? { duration:.2 } : { duration:2.7, repeat:Infinity, ease:'easeInOut', repeatDelay:.35 }}
        />
      </svg>

      <AnimatePresence>
        {hiddenPanels > 0 && (
          <motion.div className="panel-overflow show premium-overflow" id="panelOverflow" initial={{ opacity:0, scale:.9, y:6 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:.92 }} transition={{ type:'spring', stiffness:280, damping:24 }}>
            +{hiddenPanels} módulos no arranjo
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ResultMetric({ label, children, accent = false, delay = 0 }) {
  return (
    <motion.article
      layout
      className={accent ? 'result-metric-accent' : ''}
      initial={{ opacity:0, y:8 }}
      whileInView={{ opacity:1, y:0 }}
      viewport={{ once:true }}
      transition={{ duration:.32, delay }}
      whileHover={{ y:-2, transition:{ duration:.15 } }}
    >
      <span>{label}</span>{children}
    </motion.article>
  )
}

function SolarCalculator() {
  const reduced = useReducedMotion()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [error, setError] = useState('')
  const [values, setValues] = useState({
    consumption:500, bill:550, future:0, state:'SP', roofArea:40,
    orientation:'N', shade:'none', coverage:95, panelPower:585, losses:14,
  })
  const model = useMemo(() => calculateSolar(values), [values])

  const patch = update => setValues(current => ({ ...current, ...update }))
  const next = () => {
    if (step === 1 && (values.consumption < 50 || values.bill < 50)) return setError('Informe consumo e valor médio da conta para continuar.')
    if (step === 2 && values.roofArea < 8) return setError('Informe uma área útil aproximada a partir de 8 m².')
    setError('')
    setDirection(1)
    setStep(current => Math.min(4, current + 1))
  }
  const back = () => {
    setError('')
    setDirection(-1)
    setStep(current => Math.max(1, current - 1))
  }

  const stepContent = {
    1: <>
      <div className="step-heading"><span>01</span><div><small>Consumo</small><h3>Quanto você usa de energia?</h3></div></div>
      <div className="field"><label htmlFor="consumption">Consumo médio mensal</label><p>Use a média dos últimos meses da sua conta.</p><div className="input-group"><input id="consumption" type="number" min="50" max="20000" step="10" value={values.consumption} onChange={event => patch({ consumption:Number(event.target.value) })} inputMode="numeric" /><span>kWh/mês</span></div></div>
      <div className="field"><label htmlFor="bill">Valor médio da conta</label><p>Usado apenas para a estimativa financeira.</p><div className="input-group money"><span>R$</span><input id="bill" type="number" min="50" max="50000" step="10" value={values.bill} onChange={event => patch({ bill:Number(event.target.value) })} inputMode="decimal" /><small>/mês</small></div></div>
      <div className="field"><label>Prevê aumento de consumo?</label><ChoiceGroup id="futureLoadGroup" value={values.future} options={[[0,'Não'],[10,'+10%'],[20,'+20%'],[30,'+30%']]} onChange={future => patch({ future })} /></div>
    </>,
    2: <>
      <div className="step-heading"><span>02</span><div><small>Imóvel</small><h3>Onde o sistema será instalado?</h3></div></div>
      <div className="field"><label htmlFor="state">Estado</label><select id="state" value={values.state} onChange={event => patch({ state:event.target.value })}>{['SP','RJ','MG','ES','PR','SC','RS','DF','GO','MT','MS','BA','PE','CE','RN','PB','AL','SE','PI','MA','AM','PA','AC','RO','RR','AP','TO'].map(uf => <option key={uf} value={uf}>{UF_NAMES[uf]}</option>)}</select></div>
      <div className="field"><label htmlFor="roofArea">Área útil aproximada para os módulos</label><p>Informe apenas a área que poderia receber painéis.</p><div className="input-group"><input id="roofArea" type="number" min="8" max="5000" step="1" value={values.roofArea} onChange={event => patch({ roofArea:Number(event.target.value) })} inputMode="decimal" /><span>m²</span></div></div>
    </>,
    3: <>
      <div className="step-heading"><span>03</span><div><small>Condições</small><h3>Como é a exposição solar?</h3></div></div>
      <div className="field"><label>Orientação predominante</label><ChoiceGroup id="orientationGroup" value={values.orientation} options={[["N","Norte"],["NE","NE / NO"],["E","Leste / Oeste"],["S","Sul"]]} onChange={orientation => patch({ orientation })} /></div>
      <div className="field"><label>Sombreamento</label><ChoiceGroup id="shadeGroup" value={values.shade} options={[["none","Nenhum"],["light","Leve"],["medium","Médio"],["high","Alto"]]} onChange={shade => patch({ shade })} /></div>
      <div className="field"><div className="range-head"><label htmlFor="coverage">Meta de compensação</label><strong id="coverageLabel">{values.coverage}%</strong></div><input id="coverage" type="range" min="50" max="100" value={values.coverage} onChange={event => patch({ coverage:Number(event.target.value) })} /></div>
    </>,
    4: <>
      <div className="step-heading"><span>04</span><div><small>Ajustes</small><h3>Refine a estimativa</h3></div></div>
      <div className="field"><label htmlFor="panelPower">Potência do módulo</label><select id="panelPower" value={values.panelPower} onChange={event => patch({ panelPower:Number(event.target.value) })}>{[550,585,610,700].map(w => <option key={w} value={w}>{w} W</option>)}</select></div>
      <div className="field"><div className="range-head"><label htmlFor="losses">Perdas totais estimadas</label><strong><span id="lossesLabel">{values.losses}</span>%</strong></div><input id="losses" type="range" min="8" max="22" value={values.losses} onChange={event => patch({ losses:Number(event.target.value) })} /><p>Inclui efeitos de temperatura, sujeira, cabeamento, inversor e outros fatores do sistema.</p></div>
      <div className="tip-box"><strong>Pré-dimensionamento</strong><p>Inclinação real, sombras, estrutura, padrão elétrico e regras da distribuidora precisam ser confirmados na avaliação técnica.</p></div>
    </>,
  }

  return (
    <section className="section simulator-section premium-simulator" id="simulador">
      <Reveal className="shell section-head"><span className="section-kicker">Calculadora solar</span><h2>Faça uma pré-análise do seu projeto</h2><p>Veja uma estimativa de potência, quantidade de módulos, geração, área necessária, economia e investimento. O resultado é atualizado enquanto você altera os parâmetros.</p></Reveal>
      <div className="shell simulator-grid">
        <motion.div className="wizard-card premium-wizard" layout>
          <div className="wizard-head">
            <div><span>Etapa</span><strong id="wizardProgress">{step} de 4</strong></div>
            <LayoutGroup id="wizard-progress">
              <div className="wizard-dots premium-step-dots" aria-label="Progresso">
                {[1,2,3,4].map(item => (
                  <motion.i key={item} layout className={`step-dot ${item === step ? 'active' : ''} ${item < step ? 'done' : ''}`}>
                    {item === step && <motion.span className="step-dot-ring" layoutId="active-step-ring" transition={{ type:'spring', stiffness:360, damping:30 }} />}
                  </motion.i>
                ))}
              </div>
            </LayoutGroup>
          </div>
          <form id="solarForm" onSubmit={event => event.preventDefault()} noValidate>
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.section
                key={step}
                custom={direction}
                className="wizard-step active"
                variants={{
                  enter:dir => ({ opacity:0, x:reduced ? 0 : dir * 24, filter:reduced ? 'none' : 'blur(4px)' }),
                  center:{ opacity:1, x:0, filter:'blur(0px)' },
                  exit:dir => ({ opacity:0, x:reduced ? 0 : dir * -18, filter:reduced ? 'none' : 'blur(3px)' }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration:.26, ease:[.2,.8,.2,1] }}
              >
                {stepContent[step]}
                <AnimatePresence>{error && <motion.p className="form-error" initial={{ opacity:0, y:-5, scale:.98 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-3 }}>{error}</motion.p>}</AnimatePresence>
                <div className={`step-actions ${step === 1 ? 'solo' : ''}`}>
                  {step > 1 && <motion.button whileTap={{ scale:.97 }} className="btn btn-secondary back-step" type="button" onClick={back}>Voltar</motion.button>}
                  {step < 4 ? <motion.button whileTap={{ scale:.97 }} className="btn btn-primary next-step" type="button" onClick={next}>Continuar <span>→</span></motion.button> : <RollingLink primary className="btn btn-primary" href="#contato">Solicitar projeto</RollingLink>}
                </div>
              </motion.section>
            </AnimatePresence>
          </form>
        </motion.div>

        <motion.aside className="preview-card premium-preview" aria-label="Pré-visualização do sistema" layout>
          <div className="preview-top"><div><span>Pré-visualização</span><strong>Arranjo estimado dos módulos</strong></div><motion.span className="live-badge" animate={reduced ? undefined : { boxShadow:['0 0 0 0 rgba(28,145,78,0)','0 0 0 7px rgba(28,145,78,.08)','0 0 0 0 rgba(28,145,78,0)'] }} transition={{ duration:2.4, repeat:Infinity }}><i></i> ao vivo</motion.span></div>

          <SolarEnergyScene values={values} model={model} reduced={reduced} />

          <div className="scene-meta premium-scene-meta">
            <motion.div layout><span>Orientação</span><strong id="orientationText">{ORIENTATION_LABEL[values.orientation]}</strong></motion.div>
            <motion.div layout><span>Sombra</span><strong id="shadeText">{SHADE_LABEL[values.shade]}</strong></motion.div>
            <motion.div layout><span>Recurso solar</span><strong id="solarResourceText">≈ {nf1.format(model.sun)} kWh/m².dia</strong></motion.div>
          </div>

          <AnimatePresence initial={false}>
            {!model.fits && (
              <motion.div className="warning-box show" id="roofWarning" initial={{ opacity:0, height:0, y:-4 }} animate={{ opacity:1, height:'auto', y:0 }} exit={{ opacity:0, height:0, y:-4 }} transition={{ duration:.28 }}>
                <strong>A área informada pode não ser suficiente</strong>
                <p>Os módulos ocupam cerca de <b id="warningRequiredArea">{nf1.format(model.moduleArea)}</b> m², para <b id="warningAvailableArea">{nf1.format(model.roofArea)}</b> m² disponíveis.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="live-metrics premium-live-metrics">
            <motion.article layout><span>Sistema</span><strong id="liveSystemKw"><AnimatedNumber value={model.installedKw} format={value => `${nf2.format(value)} kWp`} /></strong></motion.article>
            <motion.article layout><span>Módulos</span><strong id="livePanels"><AnimatedNumber value={model.panels} format={value => nf0.format(Math.round(value))} /></strong></motion.article>
            <motion.article layout><span>Geração/mês</span><strong><AnimatedNumber value={model.monthlyGeneration} format={value => nf0.format(value)} /> kWh</strong></motion.article>
            <motion.article layout><span>Meta atingida</span><strong><AnimatedNumber value={Math.min(100, model.coverage)} format={value => nf0.format(value)} />%</strong></motion.article>
          </div>

          <div className="meter-card premium-meter"><div className="meter-head"><span>Ocupação mínima estimada</span><strong>{nf1.format(model.moduleArea)} / {nf1.format(model.roofArea)} m²</strong></div><div className="meter-track"><motion.i id="areaMeter" animate={{ width:`${Math.min(100, model.moduleArea / model.roofArea * 100)}%`, background:model.fits ? undefined : 'linear-gradient(90deg,#bd5b42,#f39a79)' }} transition={{ type:'spring', stiffness:145, damping:25 }} /></div></div>

          <motion.div className="result-card premium-result-card" layout transition={{ layout:{ type:'spring', stiffness:170, damping:27 } }}>
            <div className="result-hero"><span>Potência instalada estimada</span><strong id="resultKw"><AnimatedNumber value={model.installedKw} format={value => nf2.format(value)} /> <small>kWp</small></strong><p id="resultCoverageText">Meta energética de {Math.round(model.targetFraction * 100)}%</p></div>
            <div className="result-grid">
              <ResultMetric label="Módulos"><strong><AnimatedNumber value={model.panels} format={value => nf0.format(Math.round(value))} /></strong><small>{model.panelW} W por módulo</small></ResultMetric>
              <ResultMetric label="Geração mensal" delay={.02}><strong><AnimatedNumber value={model.monthlyGeneration} format={value => nf0.format(value)} /> kWh</strong></ResultMetric>
              <ResultMetric label="Geração anual" delay={.04}><strong><AnimatedNumber value={model.monthlyGeneration*12} format={value => nf0.format(value)} /> kWh</strong></ResultMetric>
              <ResultMetric label="Área dos módulos" delay={.06}><strong>{nf1.format(model.moduleArea)} m²</strong></ResultMetric>
              <ResultMetric label="Economia bruta estimada" accent delay={.08}><strong>{brl0.format(model.monthlySavings)}/mês</strong></ResultMetric>
              <ResultMetric label="Investimento indicativo" delay={.10}><strong>{compactBrl(model.investmentLow)} – {compactBrl(model.investmentHigh).replace('R$ ','')}</strong></ResultMetric>
              <ResultMetric label="Payback simples" delay={.12}><strong>{model.paybackLow ? `${model.paybackLow.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} – ${model.paybackHigh.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} anos` : '—'}</strong></ResultMetric>
              <ResultMetric label="Compatibilidade de área" delay={.14}><strong style={!model.fits ? { color:'#a6452f' } : undefined}>{model.fits ? 'Compatível com a área informada.' : `Faltam ≈ ${nf1.format(model.moduleArea - model.roofArea)} m².`}</strong></ResultMetric>
            </div>
            <p>As estimativas financeiras não incluem particularidades tributárias, custo mínimo da distribuidora, financiamento ou condições específicas do imóvel.</p>
          </motion.div>
        </motion.aside>
      </div>
      <div id="calculator-project-data" data-summary={`${nf2.format(model.installedKw)} kWp|${model.panels}|${nf0.format(model.monthlyGeneration)}`} hidden />
    </section>
  )
}

const UF_NAMES = {
  SP:'São Paulo', RJ:'Rio de Janeiro', MG:'Minas Gerais', ES:'Espírito Santo', PR:'Paraná', SC:'Santa Catarina', RS:'Rio Grande do Sul', DF:'Distrito Federal', GO:'Goiás', MT:'Mato Grosso', MS:'Mato Grosso do Sul', BA:'Bahia', PE:'Pernambuco', CE:'Ceará', RN:'Rio Grande do Norte', PB:'Paraíba', AL:'Alagoas', SE:'Sergipe', PI:'Piauí', MA:'Maranhão', AM:'Amazonas', PA:'Pará', AC:'Acre', RO:'Rondônia', RR:'Roraima', AP:'Amapá', TO:'Tocantins',
}

function ProcessSection() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target:ref, offset:['start 78%','end 35%'] })
  const lineScale = reduced ? 1 : scrollYProgress
  const process = [
    ['01','Diagnóstico','Consumo, objetivos, localização e características iniciais do imóvel.'],
    ['02','Projeto','Dimensionamento e definição dos equipamentos e do arranjo.'],
    ['03','Homologação','Documentação e processo aplicável junto à distribuidora.'],
    ['04','Instalação','Montagem elétrica e mecânica conforme o projeto aprovado.'],
    ['05','Comissionamento','Verificação final e orientação para acompanhamento do sistema.'],
  ]
  return (
    <section className="section premium-process" id="processo" ref={ref}>
      <Reveal className="shell section-head"><span className="section-kicker">Como funciona</span><h2>Um processo claro até o sistema entrar em operação</h2></Reveal>
      <div className="shell process-track-wrap">
        <div className="process-progress-rail" aria-hidden="true"><motion.i style={{ scaleY:lineScale, transformOrigin:'top' }} /></div>
        <div className="process-grid premium-process-grid">
          {process.map(([n,t,p],i)=><Reveal key={t} className="process-card premium-process-card" delay={i*.045}><span>{n}</span><h3>{t}</h3><p>{p}</p></Reveal>)}
        </div>
      </div>
    </section>
  )
}

function ContentSections() {
  const solutions = [
    ['01','Residencial','Projetos para casas e condomínios, considerando consumo atual e crescimento previsto.'],
    ['02','Comercial','Soluções para empresas que buscam reduzir exposição à conta de energia e melhorar previsibilidade de custos.'],
    ['03','Projeto completo','Dimensionamento, documentação, homologação, instalação e comissionamento em um fluxo integrado.'],
  ]
  return <>
    <section className="section soft" id="solucoes">
      <Reveal className="shell section-head"><span className="section-kicker">Soluções RobSun</span><h2>Do estudo à instalação do sistema</h2><p>O objetivo não é apenas escolher painéis: é entregar um projeto coerente com o consumo, o imóvel e as condições técnicas da instalação.</p></Reveal>
      <div className="shell card-grid">{solutions.map(([n,t,p],i)=><Reveal key={t} className="info-card premium-info-card" delay={i*.06}><span>{n}</span><h3>{t}</h3><p>{p}</p></Reveal>)}</div>
    </section>
    <ProcessSection />
    <section className="section dark" id="diferenciais"><div className="shell methodology-grid"><Reveal className="method-copy"><span className="section-kicker on-dark">Por que RobSun</span><h2>Projeto solar precisa ser simples para o cliente e rigoroso na engenharia</h2><p>A simulação ajuda a visualizar o potencial. A etapa técnica confirma o que realmente será instalado e documentado.</p></Reveal><div className="method-list"><Reveal as="article"><strong>Dimensionamento responsável</strong><p>Sem tratar a estimativa online como projeto executivo.</p></Reveal><Reveal as="article" delay={.05}><strong>Transparência nas premissas</strong><p>Consumo, incidência solar, orientação, perdas e área são apresentados de forma compreensível.</p></Reveal><Reveal as="article" delay={.1}><strong>Execução integrada</strong><p>Projeto, homologação, instalação e comissionamento dentro da mesma jornada.</p></Reveal><Reveal as="article" delay={.15}><strong>Experiência mobile-first</strong><p>O cliente consegue entender o projeto e solicitar atendimento diretamente pelo celular.</p></Reveal></div></div></section>
  </>
}

function FAQ() {
  const items = [
    ['A calculadora já é um orçamento?', 'Não. Ela é uma pré-análise. O orçamento definitivo depende da avaliação técnica, equipamentos escolhidos, estrutura, elétrica, logística e regras aplicáveis da distribuidora.'],
    ['A RobSun cuida da homologação?', 'A proposta de projeto completo contempla o processo documental e de homologação aplicável ao sistema contratado.'],
    ['O sistema elimina totalmente a conta de energia?', 'Não necessariamente. Mesmo com geração solar podem permanecer cobranças mínimas, encargos e outras parcelas que dependem da modalidade tarifária e das regras vigentes.'],
    ['É possível instalar em empresa?', 'Sim. Projetos comerciais seguem os mesmos princípios, com dimensionamento adequado ao perfil de consumo e às condições elétricas e estruturais do local.'],
  ]
  return (
    <section className="section" id="faq">
      <Reveal className="shell section-head"><span className="section-kicker">Dúvidas frequentes</span><h2>O que vale saber antes de contratar</h2></Reveal>
      <div className="shell faq-grid">{items.map(([q,a])=><motion.details className="faq-item" key={q} layout><summary>{q}</summary><p>{a}</p></motion.details>)}</div>
    </section>
  )
}

function Contact({ contactRef }) {
  const [sent, setSent] = useState(false)
  return (
    <section className="section contact-section" id="contato" ref={contactRef}>
      <Reveal className="shell contact-card">
        <div><span className="section-kicker">Próximo passo</span><h2>Receba uma avaliação para o seu projeto solar</h2><p>Envie seus dados para continuar a partir da pré-análise. Nesta demonstração, o formulário valida o fluxo sem transmitir informações para um backend.</p><div className="lead-project-summary" id="leadProjectSummary"><span>Sua simulação</span><strong>O dimensionamento é atualizado na calculadora acima.</strong></div></div>
        <form className="contact-form" id="contactForm" onSubmit={event=>{event.preventDefault(); if(event.currentTarget.reportValidity()) setSent(true)}}>
          <label><span>Seu nome</span><input id="leadName" type="text" required autoComplete="name" placeholder="Como podemos te chamar?" /></label>
          <label><span>WhatsApp</span><input id="leadPhone" type="tel" required autoComplete="tel" placeholder="(11) 99999-9999" /></label>
          <label><span>E-mail</span><input id="leadEmail" type="email" required autoComplete="email" placeholder="voce@exemplo.com" /></label>
          <motion.button whileTap={{ scale:.975 }} whileHover={{ y:-1 }} className="btn btn-primary" type="submit">{sent ? 'Solicitação registrada ✓' : 'Solicitar avaliação'}</motion.button>
          <AnimatePresence>{sent && <motion.small className="show" id="formSuccess" initial={{ opacity:0, y:-5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>Solicitação registrada com sucesso nesta demonstração.</motion.small>}</AnimatePresence>
        </form>
      </Reveal>
    </section>
  )
}

function Footer() {
  return <footer className="site-footer"><div className="shell footer-inner"><div><img src={logo} alt="RobSun" className="footer-logo" /><p>Projetos e instalação de energia solar com clareza, planejamento e acompanhamento técnico.</p></div><div className="footer-links"><a href="#simulador">Calculadora</a><a href="#solucoes">Soluções</a><a href="#processo">Como funciona</a><a href="#faq">Dúvidas</a></div></div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} RobSun</span><span>Simulações são estimativas orientativas.</span></div></footer>
}

function App() {
  const contactRef = useRef(null)
  const contactVisible = useInView(contactRef, { amount:.1 })
  return <>
    <Header />
    <main><Hero /><TrustStrip /><SolarCalculator /><ContentSections /><FAQ /><Contact contactRef={contactRef} /></main>
    <Footer />
    <AnimatePresence>{!contactVisible && <motion.a className="sticky-mobile-cta" href="#contato" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:16 }} whileTap={{ scale:.975 }}>Solicitar meu projeto</motion.a>}</AnimatePresence>
  </>
}

createRoot(document.getElementById('root')).render(<App />)
