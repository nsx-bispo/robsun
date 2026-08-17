import './calculator-polish.css'
import { CALCULATOR_HELP } from './calculator-help-content.js'

const RULES=[['consumption',/(consumo médio|consumo mensal|seu consumo)/i],['bill',/(valor médio da conta|valor da conta|conta de energia)/i],['location',/(cidade ou cep|cidade\/cep|localização)/i],['state',/^estado$/i],['roofArea',/(área útil|área disponível|área aproximada)/i],['roofType',/(tipo de telhado|tipo de cobertura|cobertura)/i],['orientation',/(orientação predominante|orientação do telhado|^orientação$)/i],['shading',/(sombreamento|sombra)/i],['margin',/(folga de dimensionamento|folga|margem extra)/i],['future',/(crescimento previsto|aumento futuro|consumo futuro)/i],['tilt',/(inclinação aproximada|inclinação)/i],['panelPower',/(potência do módulo|potência.*painel)/i],['losses',/(perdas do sistema|perdas)/i],['connection',/(tipo de ligação|ligação elétrica|ligação da unidade)/i],['gdRule',/(regra.*gd|regra de compensação|scee)/i],['selfConsumption',/(autoconsumo)/i],['fioB',/(fio b)/i],['fixedCharges',/(encargos fixos|não compensáveis)/i],['systemPower',/(potência do sistema|potência instalada estimada|^sistema$)/i],['panels',/(módulos|painéis)/i],['generation',/(geração mensal|geração estimada|^geração$)/i],['area',/(área mínima|área estimada|área útil estimada)/i],['savings',/(economia mensal|economia líquida|^economia$)/i],['investment',/(investimento)/i],['payback',/(payback|retorno do investimento|retorno estimado)/i]]

const COPY_MAP=new Map([
 ['Área útil','Área disponível no telhado'],
 ['Cobertura','Tipo de telhado'],
 ['Prevê aumento de consumo?','Aumento previsto de consumo'],
 ['Quer adicionar uma folga ao dimensionamento?','Margem extra'],
 ['Quanto do consumo você quer gerar?','Quanto do consumo quer atender?'],
 ['Ligação da unidade','Ligação elétrica do imóvel'],
 ['Perdas estimadas','Ajuste técnico de perdas'],
 ['Módulos','Painéis'],
 ['Área mínima','Área estimada'],
 ['Payback simples','Retorno estimado'],
])

const style=document.createElement('style')
style.textContent=`
.robsun-help-target{display:inline-flex;align-items:center;position:relative;padding-right:28px;flex-wrap:nowrap}
.robsun-info{appearance:none;position:absolute;right:-7px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:#165b3d;width:44px;height:44px;min-width:44px;border-radius:50%;display:grid;place-items:center;font-size:0;cursor:pointer;padding:0;vertical-align:middle;opacity:.88;z-index:2}
.robsun-info:before{content:'i';width:23px;height:23px;border:1px solid rgba(18,63,43,.24);background:rgba(255,255,255,.78);border-radius:50%;display:grid;place-items:center;font:700 11px/1 system-ui;transition:.16s ease}
.robsun-info:hover{opacity:1}.robsun-info:hover:before{background:#eef7f1;transform:translateY(-1px)}
.robsun-info:focus-visible{outline:0;opacity:1}.robsun-info:focus-visible:before{outline:3px solid rgba(31,108,75,.22);outline-offset:3px}
.robsun-help-dialog{border:0;border-radius:18px;padding:0;max-width:460px;width:min(460px,calc(100vw - 32px));box-shadow:0 24px 70px rgba(0,0,0,.24);color:#14251d}
.robsun-help-dialog::backdrop{background:rgba(7,18,13,.48);backdrop-filter:blur(2px)}
.robsun-help-box{padding:23px}.robsun-help-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.robsun-help-top h3{font:700 21px/1.18 Manrope,system-ui,sans-serif;margin:0;max-width:350px}.robsun-help-close{border:0;background:#eef2ee;width:44px;height:44px;min-width:44px;border-radius:50%;font-size:19px;cursor:pointer;flex:0 0 auto}.robsun-help-box p{font:400 14px/1.58 DM Sans,Inter,system-ui,sans-serif;color:#4a5a52;margin:14px 0 0}.robsun-help-box b{color:#14251d}.robsun-help-example{margin-top:16px;padding:13px 14px;background:#f3f6f2;border-left:3px solid #2f8a63;font-size:13px;line-height:1.52;color:#425149}
@media(max-width:600px){.robsun-help-dialog{position:fixed;inset:auto 8px 8px;width:calc(100vw - 16px);max-width:none;margin:0;border-radius:20px 20px 14px 14px}.robsun-help-box{padding:20px}.robsun-help-top h3{font-size:19px}.robsun-help-dialog::backdrop{background:rgba(7,18,13,.43)}}
`
document.head.appendChild(style)

const dialog=document.createElement('dialog')
dialog.className='robsun-help-dialog'
dialog.innerHTML='<div class="robsun-help-box"><div class="robsun-help-top"><h3></h3><button class="robsun-help-close" type="button" aria-label="Fechar explicação">×</button></div><p class="robsun-help-what"></p><p class="robsun-help-why"></p><div class="robsun-help-example"></div></div>'
document.body.appendChild(dialog)
dialog.querySelector('.robsun-help-close').addEventListener('click',()=>dialog.close())
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()})

function openHelp(key){const item=CALCULATOR_HELP[key];if(!item)return;dialog.querySelector('h3').textContent=item.title;dialog.querySelector('.robsun-help-what').textContent=item.what;dialog.querySelector('.robsun-help-why').innerHTML=`<b>Por que isso importa:</b> ${item.why}`;dialog.querySelector('.robsun-help-example').innerHTML=`<b>Exemplo:</b> ${item.example}`;if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','')}
function matchKey(text){const clean=(text||'').replace(/\s+/g,' ').trim();for(const[key,re]of RULES)if(re.test(clean))return key;return null}
function polishCopy(root){
 const labels=root.querySelectorAll('.field>label,.range-head label,.result-grid article>span')
 for(const el of labels){
  if(el.querySelector('.robsun-info'))continue
  const clean=(el.textContent||'').replace(/\s+/g,' ').trim()
  const replacement=COPY_MAP.get(clean)
  if(replacement)el.textContent=replacement
 }
 const v2Toggle=root.querySelector('.v2-details-toggle')
 if(v2Toggle&&!root.querySelector('.v2-calc-start.tertiary')){
  const section=document.createElement('div');section.className='v2-calc-start tertiary';section.innerHTML='<strong>3. Refine se quiser</strong><span>Os próximos campos são opcionais. Use-os apenas se você já souber as respostas.</span>';v2Toggle.before(section)
 }
}
function inject(){
 const root=document.querySelector('#simulador');if(!root)return
 polishCopy(root)
 const candidates=root.querySelectorAll('.v2-field>span,.field>label,.range-head label,.result-hero>span,.result-grid article>span,.v2-result-term')
 for(const el of candidates){if(el.dataset.robsunHelpBound==='1')continue;const key=matchKey(el.textContent);if(!key)continue;el.dataset.robsunHelpBound='1';el.classList.add('robsun-help-target');const btn=document.createElement('button');btn.type='button';btn.className='robsun-info';btn.textContent='i';btn.setAttribute('aria-label',`Entenda: ${CALCULATOR_HELP[key].title}`);btn.dataset.helpKey=key;btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openHelp(key)});el.appendChild(btn)}
}
let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;inject()})};new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule()
