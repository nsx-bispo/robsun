import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'

const host = '127.0.0.1'
const port = 4173
const baseUrl = `http://${host}:${port}/robsun/`
const resultsDir = 'test-results'
await fs.mkdir(resultsDir, { recursive:true })

const server = spawn('npm', ['run', 'preview', '--', '--host', host, '--port', String(port)], { stdio:['ignore','pipe','pipe'], shell:process.platform==='win32' })
let serverOutput=''
server.stdout.on('data', chunk => { serverOutput += chunk.toString() })
server.stderr.on('data', chunk => { serverOutput += chunk.toString() })

async function waitForServer(){for(let i=0;i<60;i+=1){try{const r=await fetch(baseUrl);if(r.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,250))}throw new Error(`Vite preview did not start.\n${serverOutput}`)}
function assert(condition,message){if(!condition)throw new Error(message)}
async function settle(page){await page.waitForTimeout(360)}
async function assertNoHorizontalOverflow(page,label){const metrics=await page.evaluate(()=>({innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth}));assert(metrics.scrollWidth<=metrics.innerWidth+1,`${label}: document overflow ${JSON.stringify(metrics)}`);assert(metrics.bodyScrollWidth<=metrics.innerWidth+1,`${label}: body overflow ${JSON.stringify(metrics)}`)}
async function assertTapTargets(page,label){const bad=await page.locator('button:visible, a.btn:visible, input:visible, select:visible, summary:visible').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return{tag:element.tagName,text:(element.textContent||element.getAttribute('aria-label')||'').trim().slice(0,80),height:r.height}}).filter(item=>item.height>0&&item.height<43));assert(bad.length===0,`${label}: undersized tap targets ${JSON.stringify(bad)}`)}

async function testViewport(browser,viewport,label,mobile){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'})
  const page=await context.newPage();const consoleErrors=[]
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});page.on('pageerror',error=>consoleErrors.push(error.message))
  try{
    await page.goto(baseUrl,{waitUntil:'networkidle'});await settle(page)
    await assertNoHorizontalOverflow(page,label);await assertTapTargets(page,label)
    const simulatorTop=await page.locator('#simulador').evaluate(el=>el.getBoundingClientRect().top+window.scrollY)
    const includedTop=await page.locator('#incluido').evaluate(el=>el.getBoundingClientRect().top+window.scrollY)
    assert(simulatorTop<includedTop,`${label}: calculator moved too far down the journey`)
    const first=(await page.locator('#typewriter').textContent())?.trim()||'';assert(first.length>0,`${label}: typewriter started empty`)
    await page.waitForTimeout(1850);const second=(await page.locator('#typewriter').textContent())?.trim()||'';assert(second.length>0,`${label}: typewriter entered empty state`)
    await page.locator('#simulador').scrollIntoViewIfNeeded();await settle(page)

    if(mobile){
      const visibleScene=page.locator('.mobile-calculator-scene:visible').first()
      assert(await visibleScene.isVisible(),`${label}: integrated mobile scene is not visible`)
      assert(await page.locator('.desktop-preview:visible').count()===0,`${label}: desktop preview occupies mobile layout`)
      const card=await page.locator('.wizard-card').boundingBox();const scene=await page.locator('.solar-scene-compact:visible').first().boundingBox()
      assert(card&&scene,`${label}: calculator card or scene missing`);assert(scene.x>=card.x-1,`${label}: scene escapes left`);assert(scene.x+scene.width<=card.x+card.width+1,`${label}: scene escapes right`)
      assert(await page.locator('.result-card-mobile').isVisible(),`${label}: mobile results missing`)

      await page.getByRole('button',{name:/Continuar/}).click();await settle(page)
      assert(await page.locator('#cityCep').isVisible(),`${label}: city/CEP missing on step 2`);assert(await page.locator('#roofType').isVisible(),`${label}: roof type missing on step 2`);assert(await page.locator('.mobile-calculator-scene:visible').count()===1,`${label}: step transition did not settle to one mobile scene`)

      await page.getByRole('button',{name:/Continuar/}).click();await settle(page)
      assert(await page.locator('#orientationGroup').isVisible(),`${label}: orientation controls missing`)
      await page.getByRole('button',{name:'Sul',exact:true}).click();await page.waitForTimeout(260)
      const orientation=await page.locator('.solar-scene-compact:visible').first().getAttribute('data-orientation');assert(orientation==='S',`${label}: scene did not react to orientation`)

      await page.getByRole('button',{name:/Continuar/}).click();await settle(page)
      const details=page.locator('.advanced-details');assert(await details.isVisible(),`${label}: advanced details missing`);await details.locator('summary').click();await page.waitForTimeout(80)
      assert(await page.locator('#tilt').isVisible(),`${label}: tilt control missing`);assert(await page.locator('#gdRule').isVisible(),`${label}: 2026 compensation selector missing`);assert(await page.locator('#connection').isVisible(),`${label}: connection selector missing`)
      await assertNoHorizontalOverflow(page,`${label} after wizard`)
    }else{
      assert(await page.locator('.desktop-preview').isVisible(),`${label}: desktop preview missing`);assert(await page.locator('.desktop-preview .solar-scene').isVisible(),`${label}: desktop solar scene missing`)
      const wizard=await page.locator('.wizard-card').boundingBox();const preview=await page.locator('.desktop-preview').boundingBox();assert(wizard&&preview&&preview.x>wizard.x,`${label}: desktop two-column calculator is broken`)
    }

    await page.screenshot({path:`${resultsDir}/${label}.png`,fullPage:true})
    assert(consoleErrors.length===0,`${label}: browser errors ${consoleErrors.join(' | ')}`)
  }catch(error){await page.screenshot({path:`${resultsDir}/${label}-failure.png`,fullPage:true}).catch(()=>{});throw error}finally{await context.close()}
}

let browser
try{await waitForServer();browser=await chromium.launch({headless:true});await testViewport(browser,{width:320,height:700},'mobile-320',true);await testViewport(browser,{width:393,height:852},'iphone-393',true);await testViewport(browser,{width:430,height:932},'mobile-430',true);await testViewport(browser,{width:1440,height:1000},'desktop-1440',false);console.log('✓ Browser E2E checks passed for 320, 393, 430 and desktop viewports.')}finally{if(browser)await browser.close();server.kill('SIGTERM')}
