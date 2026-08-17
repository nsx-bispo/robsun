import { chromium } from 'playwright'
function assert(c,m){if(!c)throw new Error(m)}
const browser=await chromium.launch({headless:true})
try{
  // Cenário 1 — cliente leigo na V1 encontra ajuda sem sair da calculadora.
  {
    const p=await browser.newPage({viewport:{width:393,height:852}})
    await p.goto('http://127.0.0.1:4173/robsun/',{waitUntil:'domcontentloaded'})
    await p.locator('#simulador').scrollIntoViewIfNeeded()
    await p.waitForTimeout(250)
    const helps=p.locator('#simulador .robsun-info')
    assert(await helps.count()>=2,'V1: poucos pontos de ajuda visíveis')
    await helps.first().click()
    assert((await p.locator('.robsun-help-dialog').textContent()).includes('Exemplo:'),'V1: ajuda sem exemplo simples')
    await p.close()
    console.log('✓ mesa 1: V1 explica termos no contexto')
  }
  // Cenário 2 — cliente leigo na V2 só sabe conta e estado; telhado pode ficar desconhecido.
  {
    const p=await browser.newPage({viewport:{width:393,height:852}})
    await p.goto('http://127.0.0.1:4173/robsun/v2/',{waitUntil:'domcontentloaded'})
    await p.locator('#simulador').scrollIntoViewIfNeeded()
    assert(await p.getByRole('button',{name:'Não sei',exact:true}).count()>=2,'V2: orientação/sombra não aceitam “Não sei”')
    assert(await p.locator('.v2-result-empty').isVisible(),'V2: resultado não começa neutro')
    await p.locator('#v2-consumption').fill('430')
    await p.locator('#v2-bill').fill('510')
    await p.locator('#v2-state').selectOption('SP')
    await p.waitForTimeout(100)
    assert(await p.locator('.v2-result-main').isVisible(),'V2: não gera estimativa com dados mínimos')
    assert((await p.locator('.v2-fit').textContent()).includes('ainda não informada'),'V2: área desconhecida tratada como se fosse conhecida')
    await p.close()
    console.log('✓ mesa 2: V2 funciona mesmo quando cliente não conhece o telhado')
  }
  // Cenário 3 — cliente revisa a simulação antes de falar com a RobSun.
  {
    const p=await browser.newPage({viewport:{width:1440,height:1000}})
    await p.goto('http://127.0.0.1:4173/robsun/v2/',{waitUntil:'domcontentloaded'})
    await p.locator('#v2-consumption').fill('600')
    await p.locator('#v2-bill').fill('700')
    await p.locator('#v2-state').selectOption('SP')
    await p.locator('#v2-city').fill('Santo André')
    await p.getByRole('button',{name:/Enviar esta simulação/}).click()
    assert((await p.locator('.v2-lead-summary').textContent()).includes('600'),'V2: resumo não levou o consumo ao contato')
    await p.getByRole('button',{name:/Revisar minha simulação/}).click()
    await p.locator('#v2-consumption').fill('750')
    await p.getByRole('button',{name:/Enviar esta simulação/}).click()
    assert((await p.locator('.v2-lead-summary').textContent()).includes('750'),'V2: resumo não atualizou após revisão')
    await p.close()
    console.log('✓ mesa 3: cliente consegue revisar e reenviar a simulação')
  }
  // Cenário 4 — cliente que não quer simular consegue ir direto ao contato.
  {
    const p=await browser.newPage({viewport:{width:393,height:852}})
    await p.goto('http://127.0.0.1:4173/robsun/v2/',{waitUntil:'domcontentloaded'})
    await p.getByRole('button',{name:'Abrir menu'}).click()
    await p.getByRole('button',{name:'Solicitar avaliação',exact:true}).click()
    await p.locator('#contato').waitFor()
    assert(await p.locator('.v2-contact-form').isVisible(),'V2: contato direto inacessível')
    assert((await p.locator('.v2-contact-copy').textContent()).includes('Prefiro simular antes'),'V2: contato direto força simulação')
    await p.close()
    console.log('✓ mesa 4: simulação é opcional para entrar em contato')
  }
  console.log('✓ Testes de mesa UX RobSun concluídos')
} finally { await browser.close() }
