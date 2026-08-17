import { chromium } from 'playwright'
import fs from 'node:fs/promises'
const baseUrl='http://127.0.0.1:4173/robsun/v2/'
const dir='test-results-v2'
await fs.mkdir(dir,{recursive:true})
function assert(c,m){if(!c)throw new Error(m)}
async function run(browser,viewport,label){
 const context=await browser.newContext({viewport})
 const page=await context.newPage()
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 try{
  await page.goto(baseUrl,{waitUntil:'domcontentloaded'})
  await page.locator('#simulador').waitFor()
  const overflow=await page.evaluate(()=>({w:innerWidth,d:document.documentElement.scrollWidth,b:document.body.scrollWidth}))
  assert(overflow.d<=overflow.w+1&&overflow.b<=overflow.w+1,`${label}: horizontal overflow ${JSON.stringify(overflow)}`)
  assert(await page.locator('.v2-hero h1').isVisible(),`${label}: hero missing`)
  assert((await page.locator('.v2-hero h1').textContent()).includes('Energia solar projetada'),`${label}: hero copy mismatch`)
  assert((await page.locator('.v2-result-empty').textContent()).includes('Preencha 3 informações'),`${label}: calculator must start neutral`)
  if(viewport.width<980){
   const menu=page.getByRole('button',{name:'Abrir menu'})
   assert(await menu.isVisible(),`${label}: mobile menu button missing`)
   await menu.click()
   assert(await page.getByRole('button',{name:'Dúvidas',exact:true}).isVisible(),`${label}: mobile navigation did not open`)
   await page.getByRole('button',{name:'Simulador',exact:true}).click()
  }
  await page.locator('#v2-consumption').fill('800')
  await page.locator('#v2-bill').fill('900')
  await page.locator('#v2-state').selectOption('SP')
  await page.locator('#v2-city').fill('Santo André')
  await page.waitForTimeout(120)
  assert(await page.locator('.v2-result-main').isVisible(),`${label}: result did not activate after minimum inputs`)
  const help=page.getByRole('button',{name:/Entenda: Consumo médio mensal/})
  assert(await help.isVisible(),`${label}: help icon missing`)
  await help.click()
  assert(await page.locator('.robsun-help-dialog').isVisible(),`${label}: help dialog did not open`)
  assert((await page.locator('.robsun-help-dialog').textContent()).includes('Exemplo:'),`${label}: help example missing`)
  await page.getByRole('button',{name:'Fechar explicação'}).click()
  await page.getByRole('button',{name:'+10%',exact:true}).click()
  await page.getByRole('button',{name:/Enviar esta simulação/}).click()
  await page.locator('#contato').waitFor()
  assert((await page.locator('.v2-lead-summary').textContent()).includes('SIMULAÇÃO ANEXADA'),`${label}: calculator summary not attached`)
  await page.waitForFunction(()=>document.querySelector('input[placeholder="Cidade ou CEP"]')?.value==='Santo André')
  assert(await page.locator('input[placeholder="Cidade ou CEP"]').inputValue()==='Santo André',`${label}: contact city not reused from simulation`)
  await page.locator('input[autocomplete="name"]').fill('Cliente Teste')
  await page.locator('input[autocomplete="tel"]').fill('(11) 99999-9999')
  await page.locator('input[autocomplete="email"]').fill('teste@example.com')
  await page.getByRole('button',{name:/Quero falar com a RobSun/}).click()
  await page.waitForTimeout(200)
  assert((await page.locator('.v2-form-status').textContent()).includes('não foi conectado'),`${label}: preview form must disclose missing endpoint`)
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('robsun:last-lead')))
  assert(stored?.calculator?.inputs?.consumption===800,`${label}: payload missing calculator input`)
  assert(stored?.calculator?.inputs?.margin===10,`${label}: payload missing design margin`)
  assert(stored?.calculator?.result?.systemKwp>0,`${label}: payload missing calculator result`)
  assert(stored?.contact?.name==='Cliente Teste',`${label}: payload missing contact`)
  assert(!errors.length,`${label}: browser errors ${errors.join(' | ')}`)
  await page.screenshot({path:`${dir}/${label}.png`,fullPage:true,animations:'disabled'})
  console.log(`✓ ${label}`)
 }finally{await context.close()}
}
const browser=await chromium.launch({headless:true})
try{await run(browser,{width:393,height:852},'v2-mobile-393');await run(browser,{width:1440,height:1000},'v2-desktop-1440');console.log('✓ RobSun V2 E2E passed')}finally{await browser.close()}
