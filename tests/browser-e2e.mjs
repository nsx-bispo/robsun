import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'

const host = '127.0.0.1'
const port = 4173
const baseUrl = `http://${host}:${port}/robsun/`
const resultsDir = 'test-results'

await fs.mkdir(resultsDir, { recursive:true })

const server = spawn('npm', ['run', 'preview', '--', '--host', host, '--port', String(port)], {
  stdio:['ignore', 'pipe', 'pipe'],
  shell:process.platform === 'win32',
})

let serverOutput = ''
server.stdout.on('data', chunk => { serverOutput += chunk.toString() })
server.stderr.on('data', chunk => { serverOutput += chunk.toString() })

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Vite preview did not start.\n${serverOutput}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    innerWidth:window.innerWidth,
    scrollWidth:document.documentElement.scrollWidth,
    bodyScrollWidth:document.body.scrollWidth,
  }))
  assert(metrics.scrollWidth <= metrics.innerWidth + 1, `${label}: document horizontal overflow ${JSON.stringify(metrics)}`)
  assert(metrics.bodyScrollWidth <= metrics.innerWidth + 1, `${label}: body horizontal overflow ${JSON.stringify(metrics)}`)
}

async function assertTapTargets(page, label) {
  const tooSmall = await page.locator('button:visible, a.btn:visible, input:visible, select:visible, summary:visible').evaluateAll(elements => elements
    .map(element => {
      const rect = element.getBoundingClientRect()
      return { tag:element.tagName, text:(element.textContent || element.getAttribute('aria-label') || '').trim().slice(0,80), width:rect.width, height:rect.height }
    })
    .filter(item => item.height > 0 && item.height < 43))
  assert(tooSmall.length === 0, `${label}: tap targets below 44px-ish: ${JSON.stringify(tooSmall)}`)
}

async function testViewport(browser, viewport, label, mobile) {
  const context = await browser.newContext({ viewport, deviceScaleFactor:1, reducedMotion:'no-preference' })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => consoleErrors.push(error.message))

  await page.goto(baseUrl, { waitUntil:'networkidle' })
  await page.waitForTimeout(500)

  await assertNoHorizontalOverflow(page, label)
  await assertTapTargets(page, label)

  const simulatorTop = await page.locator('#simulador').evaluate(element => element.getBoundingClientRect().top + window.scrollY)
  const includedTop = await page.locator('#incluido').evaluate(element => element.getBoundingClientRect().top + window.scrollY)
  assert(simulatorTop < includedTop, `${label}: calculator is no longer early in the customer journey`)

  const firstTypeText = (await page.locator('#typewriter').textContent())?.trim() || ''
  assert(firstTypeText.length > 0, `${label}: typewriter rendered empty text`)
  await page.waitForTimeout(1850)
  const secondTypeText = (await page.locator('#typewriter').textContent())?.trim() || ''
  assert(secondTypeText.length > 0, `${label}: typewriter entered an empty state`)

  await page.locator('#simulador').scrollIntoViewIfNeeded()
  await page.waitForTimeout(250)

  if (mobile) {
    assert(await page.locator('.mobile-calculator-scene').isVisible(), `${label}: integrated mobile calculator scene is not visible`)
    assert(await page.locator('.desktop-preview').count() === 0 || !(await page.locator('.desktop-preview').isVisible()), `${label}: desktop preview should not occupy mobile space`)

    const card = await page.locator('.wizard-card').boundingBox()
    const scene = await page.locator('.solar-scene-compact').boundingBox()
    assert(card && scene, `${label}: missing calculator card or mobile solar scene`)
    assert(scene.x >= card.x - 1, `${label}: solar scene escapes card on the left`)
    assert(scene.x + scene.width <= card.x + card.width + 1, `${label}: solar scene escapes card on the right`)

    assert(await page.locator('.result-card-mobile').isVisible(), `${label}: mobile results are not visible`)

    await page.getByRole('button', { name:/Continuar/ }).click()
    await page.waitForTimeout(180)
    assert(await page.locator('#cityCep').isVisible(), `${label}: city/CEP field missing on step 2`)
    assert(await page.locator('#roofType').isVisible(), `${label}: roof type field missing on step 2`)
    assert(await page.locator('.mobile-calculator-scene').isVisible(), `${label}: solar scene disappeared on step 2`)

    await page.getByRole('button', { name:/Continuar/ }).click()
    await page.waitForTimeout(180)
    assert(await page.locator('#orientationGroup').isVisible(), `${label}: orientation controls missing on step 3`)
    await page.getByRole('button', { name:'Sul', exact:true }).click()
    await page.waitForTimeout(250)
    const orientation = await page.locator('.solar-scene-compact').getAttribute('data-orientation')
    assert(orientation === 'S', `${label}: solar scene did not react to orientation change`)

    await page.getByRole('button', { name:/Continuar/ }).click()
    await page.waitForTimeout(180)
    const details = page.locator('.advanced-details')
    assert(await details.isVisible(), `${label}: advanced assumptions missing on step 4`)
    await details.locator('summary').click()
    assert(await page.locator('#tilt').isVisible(), `${label}: tilt control missing from advanced details`)
    assert(await page.locator('#gdRule').isVisible(), `${label}: 2026 compensation rule control missing`)
    assert(await page.locator('#connection').isVisible(), `${label}: connection type control missing`)

    await assertNoHorizontalOverflow(page, `${label} after wizard`)
  } else {
    assert(await page.locator('.desktop-preview').isVisible(), `${label}: desktop calculator preview is not visible`)
    assert(await page.locator('.solar-scene').isVisible(), `${label}: desktop solar scene is not visible`)
    const wizard = await page.locator('.wizard-card').boundingBox()
    const preview = await page.locator('.desktop-preview').boundingBox()
    assert(wizard && preview && preview.x > wizard.x, `${label}: desktop two-column calculator layout is broken`)
  }

  await page.screenshot({ path:`${resultsDir}/${label}.png`, fullPage:true })
  assert(consoleErrors.length === 0, `${label}: browser errors: ${consoleErrors.join(' | ')}`)
  await context.close()
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless:true })
  await testViewport(browser, { width:320, height:700 }, 'mobile-320', true)
  await testViewport(browser, { width:393, height:852 }, 'iphone-393', true)
  await testViewport(browser, { width:430, height:932 }, 'mobile-430', true)
  await testViewport(browser, { width:1440, height:1000 }, 'desktop-1440', false)
  console.log('✓ Browser E2E checks passed for 320, 393, 430 and desktop viewports.')
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
