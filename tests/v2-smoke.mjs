import fs from 'node:fs'
const source=fs.readFileSync('src/app-v2.jsx','utf8')
const css=fs.readFileSync('src/app-v2.css','utf8')
const html=fs.readFileSync('v2/index.html','utf8')
const checks=[
 [html.includes('/src/app-v2.jsx'),'v2 entrypoint'],
 [source.includes("calculateSolar(values)"),'shared audited solar model'],
 [source.includes("calculator:hasSimulation?simulation:null"),'calculator attached to lead payload'],
 [source.includes("fetch(endpoint"),'real endpoint submission support'],
 [source.includes("robsun:lead"),'integration event emitted'],
 [source.includes("sessionStorage.setItem('robsun:last-lead'"),'lead fallback preserved in session'],
 [source.includes("não exibe sucesso falso")||source.includes("não está configurado"),'no fake form success'],
 [source.includes('Engenharia antes da instalação')||source.includes('ENGENHARIA ANTES DA INSTALAÇÃO'),'engineering-led positioning'],
 [!source.includes('Typewriter'),'no typewriter gimmick'],
 [!css.includes('!important'),'v2 CSS has no important patches'],
]
let failed=false
for(const [ok,label] of checks){console.log(`${ok?'✓':'✗'} ${label}`);if(!ok)failed=true}
if(failed)process.exit(1)
console.log('RobSun V2 smoke checks passed.')
