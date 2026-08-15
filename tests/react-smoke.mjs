import fs from 'node:fs'

const source = fs.readFileSync('src/main.jsx', 'utf8')
const index = fs.readFileSync('index.html', 'utf8')
const vite = fs.readFileSync('vite.config.js', 'utf8')
const logo = fs.readFileSync('assets/logo-robsun.svg', 'utf8')

const checks = [
  [index.includes('id="root"'), 'React root exists'],
  [index.includes('/src/main.jsx'), 'React entrypoint is referenced'],
  [source.includes("from 'motion/react'"), 'Motion for React is used'],
  [source.includes('function Typewriter'), 'Typewriter component exists'],
  [source.includes('TYPEWRITER_PHRASES'), 'Rotating hero phrases exist'],
  [source.includes('function SolarCalculator'), 'Solar calculator component exists'],
  [source.includes('AnimatePresence mode="wait"'), 'Wizard step transitions use AnimatePresence'],
  [source.includes('className="panel-grid"'), 'Animated roof panel grid exists'],
  [source.includes('visiblePanels'), 'Panel count reacts to project parameters'],
  [source.indexOf('<SolarCalculator />') < source.indexOf('<ContentSections />'), 'Calculator remains before long commercial sections'],
  [source.includes('Quero meu projeto solar'), 'Primary project sales CTA exists'],
  [vite.includes("base: '/robsun/'"), 'GitHub Pages base path is configured'],
  [!logo.includes('<rect'), 'Logo background is transparent'],
]

let failed = false
for (const [ok, label] of checks) {
  if (ok) console.log(`✓ ${label}`)
  else { console.error(`✗ ${label}`); failed = true }
}

if (failed) process.exit(1)
console.log('\nRobSun React smoke checks passed.')
