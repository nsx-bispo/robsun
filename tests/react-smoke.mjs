import fs from 'node:fs'

const source = fs.readFileSync('src/app-v6.jsx', 'utf8')
const css = fs.readFileSync('src/app-v6.css', 'utf8')
const index = fs.readFileSync('index.html', 'utf8')
const vite = fs.readFileSync('vite.config.js', 'utf8')
const logo = fs.readFileSync('assets/logo-robsun.svg', 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const checks = [
  [index.includes('/src/app-v6.jsx'), 'v6 React entrypoint is referenced'],
  [source.includes('LazyMotion'), 'LazyMotion reduces animation runtime cost'],
  [source.includes('MotionConfig reducedMotion="user"'), 'Global reduced-motion policy exists'],
  [source.includes('function Typewriter'), 'Typewriter component exists'],
  [source.includes('Math.max(1, cursor)'), 'Typewriter never renders an empty phrase'],
  [source.includes('function SolarCalculator'), 'Solar calculator exists'],
  [source.includes('function SolarRoofScene'), 'Solar scene is componentized'],
  [source.includes('roof-positioner'), 'Architectural transform has a dedicated wrapper'],
  [source.includes('roof-scaler'), 'Motion scale has a separate wrapper'],
  [source.includes('AnimatePresence mode="popLayout"'), 'Panel reflow uses popLayout'],
  [source.includes('mobile-calculator-scene'), 'Mobile scene is integrated into the wizard'],
  [source.includes('Cidade ou CEP'), 'Location input exists'],
  [source.includes('Tipo de cobertura'), 'Roof type input exists'],
  [source.includes('Inclinação aproximada'), 'Tilt input exists'],
  [source.includes('new2026'), '2026 distributed-generation assumption exists'],
  [source.includes(".60"), '2026 transition factor is represented'],
  [source.includes('CONNECTION_KWH'), 'Group B availability-cost assumption exists'],
  [source.includes('Autoconsumo instantâneo'), 'Self-consumption assumption is configurable'],
  [source.includes('O que está incluído na jornada RobSun'), 'Project-scope content exists'],
  [source.includes('Nesta demonstração') === false, 'Development/demo copy is absent from customer experience'],
  [source.indexOf('<SolarCalculator/>') < source.indexOf('<ProjectIncluded/>'), 'Calculator stays early in the journey'],
  [css.includes('@media (max-width:767px)'), 'Dedicated mobile layout exists'],
  [css.includes('.preview-card{display:none}'), 'Desktop duplicate preview is hidden on mobile'],
  [css.includes('.sticky-mobile-cta') === false, 'No fixed CTA can cover mobile results'],
  [pkg.devDependencies.playwright, 'Playwright browser testing is configured'],
  [vite.includes("base: '/robsun/'"), 'GitHub Pages base path is configured'],
  [!logo.includes('<rect'), 'Logo background remains transparent'],
]

let failed = false
for (const [ok, label] of checks) {
  if (ok) console.log(`✓ ${label}`)
  else { console.error(`✗ ${label}`); failed = true }
}

if (failed) process.exit(1)
console.log('\nRobSun v6 smoke checks passed.')
