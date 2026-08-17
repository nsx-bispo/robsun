import { chromium } from 'playwright'
function assert(c,m){if(!c)throw new Error(m)}
const browser=await chromium.launch({headless:true})
try{
  // Cenário 1 — cliente leigo na V1 encontra ajuda sem poluir os cards-resumo.
  {
    const p=await browser.newPage({viewport:{width:393,height:852}})
    await p.goto('http://127.0.0.1:4173/robsun/',{waitUntil:'domcontentloaded'})
    await p.locator('#simulador').scrollIntoViewIfNeeded()
    await p.waitForTimeout(250)
    const helps=p.locator('#simulador .robsun-info')
    assert(await helps.count()>=2,'V1: poucos pontos de ajuda visíveis')
    const helpBox=await helps.first().boundingBox()
    assert(helpBox&&helpBox.width<=25&&helpBox.height<=25,'V1: ícone de ajuda voltou a dominar o layout')
    assert(await p.locator('#simulador .compact-metrics .robsun-info').count()===0,'V1: cards-resumo ficaram poluídos com ícones de ajuda')
    await helps.first().click()
    assert((await p.locator('.robsun-help-dialog').textContent()).includes('Exemplo:'),'V1: ajuda sem exemplo simples')
    await p.getByRole('button',{name:'Fechar explicação'}).click()
    await p.getByRole('button',{name:/Continuar/}).click()
    await p.waitForTimeout(180)
    assert((await p.locator('#simulador').textContent()).includes('Área disponível no telhado'),'V1: nomenclatura de área continua técnica demais')
    assert((await p.locator('#simulador').textContent()).includes('Tipo de telhado'),'V1: nomenclatura de cobertura não foi simplificada')
    await p.close()
    console.log('✓ mesa 1: V1 explica termos sem poluir o resumo')
  }
  // Cenário 2 — cliente leigo na V2 só sabe conta e estado; telhado pode ficar desconhecido.
  {
    const p=await browser.newPage({viewport:{width:393,height:852}})
    await p.goto('http://127.0.0.1:4173/robsun/v2/',{waitUntil:'domcontentloaded'})
    await p.locator('#simulador').scrollIntoViewIfNeeded()
    assert(await p.getByRole('button',{name:'Não sei',exact:true}).count()>=2,'V2: orientação/sombra não aceitam “Não sei”')
    assert(await p.locator('.v2-result-empty').isVisible(),'V2: resultado não começa neutro')
    assert((await p.locator('#simulador').textContent()).includes('3. Refine se quiser'),'V2: refinamento opcional não está separado como terceira etapa')
    const help=p.locator('#simulador .robsun-info').first()
    const helpBox=await help.boundingBox()
    assert(helpBox&&helpBox.width<=25&&helpBox.height<=25,'V2: ícone de ajuda grande demais')
    await p.locator('#v2-consumption').fill('430')
    await p.locator('#v2-bill').fill('510')
    await p.locator('#v2-state').selectOption('SP')
    await p.waitForTimeout(100)
    assert(await p.locator('.v2-result-main').isVisible(),'V2: não gera estimativa com dados mínimos')
    assert((await p.locator('.v2-fit').textContent()).includes('ainda não informada'),'V2: área desconhecida tratada como se fosse conhecida')
    await p.close()
    console.log('✓ mesa 2: V2 funciona quando cliente não conhece o telhado')
  }
  // Cenário 3 — cliente abre ajuda no mobile e recebe um bottom sheet sem perder o contexto.
  {
    const p=await browser.newPage({viewport:{width:393,height:852}})
    await p.goto('http://127.0.0.1:4173/robsun/v2/',{waitUntil:'domcontentloaded'})
    const help=p.getByRole('button',{name:/Entenda: Consumo médio mensal/})
    await help.click()
    const dialog=p.locator('.robsun-help-dialog')
    assert(await dialog.isVisible(),'V2: ajuda mobile não abriu')
    const box=await dialog.boundingBox()
    assert(box&&box.y>400,'V2: ajuda mobile deveria entrar como bottom sheet, não cobrir a tela inteira')
    assert((await dialog.textContent()).includes('Por que isso importa:'),'V2: ajuda não explica por que o campo importa')
    await p.getByRole('button',{name:'Fechar explicação'}).click()
    await p.close()
    console.log('✓ mesa 3: ajuda mobile é contextual e compacta')
  }
  // Cenário 4 — cliente revisa a simulação antes de falar com a RobSun.
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
    console.log('✓ mesa 4: cliente consegue revisar e reenviar a simulação')
  }
  // Cenário 5 — cliente que não quer simular consegue ir direto ao contato.
  {
    const p=await browser.newPage({viewport:{width:393,height:852}})
    await p.goto('http://127.0.0.1:4173/robsun/v2/',{waitUntil:'domcontentloaded'})
    await p.getByRole('button',{name:'Abrir menu'}).click()
    await p.getByRole('button',{name:'Solicitar avaliação',exact:true}).click()
    await p.locator('#contato').waitFor()
    assert(await p.locator('.v2-contact-form').isVisible(),'V2: contato direto inacessível')
    assert((await p.locator('.v2-contact-copy').textContent()).includes('Prefiro simular antes'),'V2: contato direto força simulação')
    await p.close()
    console.log('✓ mesa 5: simulação é opcional para entrar em contato')
  }
  console.log('✓ Testes de mesa UX RobSun concluídos')
} finally { await browser.close() }
