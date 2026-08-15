import fs from 'node:fs'

const source = fs.readFileSync('src/main-premium.jsx', 'utf8')
const index = fs.readFileSync('index.html', 'utf8')
const vite = fs.readFileSync('vite.config.js', 'utf8')
const logo = fs.readFileSync('assets/logo-robsun.svg', 'utf8')
const premiumCss = fs.readFileSync('src/premium-motion.css', 'utf8')

const checks = [
  [index.includes('id="root"'), 'React root exists'],
  [index.includes('/src/main-premium.jsx'), 'Premium React entrypoint is referenced'],
  [source.includes("from 'motion/react'"), 'Motion for React is used'],
  [source.includes('function Typewriter'), 'Typewriter component exists'],
  [source.includes('TYPEWRITER_PHRASES'), 'Rotating hero phrases exist'],
  [source.includes('function SolarCalculator'), 'Solar calculator component exists'],
  [source.includes('AnimatePresence mode="popLayout"'), 'Panel and wizard transitions use popLayout'],
  [source.includes('LayoutGroup id="solar-array"'), 'Solar panel layout animation exists'],
  [source.includes('function SolarEnergyScene'), 'Dedicated animated solar scene exists'],
  [source.includes('energy-flow-svg'), 'Animated energy flow exists'],
  [source.includes('useScroll'), 'Scroll-linked motion exists'],
  [source.includes('choice-active-bg'), 'Animated selection indicator exists'],
  [source.includes('process-progress-rail'), 'Scroll-driven process timeline exists'],
  [source.indexOf('<SolarCalculator />') < source.indexOf('<ContentSections />'), 'Calculator remains before long commercial sections'],
  [source.includes('Quero meu projeto solar'), 'Primary project sales CTA exists'],
  [premiumCss.includes('.premium-roof-stage'), 'Premium roof styling exists'],
  [premiumCss.includes('@media (prefers-reduced-motion:reduce)'), 'Reduced-motion safeguards exist'],
  [vite.includes("base: '/robsun/'"), 'GitHub Pages base path is configured'],
  [!logo.includes('<rect'), 'Logo background is transparent'],
]

let failed = false
for (const [ok, label] of checks) {
  if (ok) console.log(`✓ ${label}`)
  else { console.error(`✗ ${label}`); failed = true }
}

if (failed) process.exit(1)
console.log('\nRobSun premium React smoke checks passed.')
