const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const stateRegion = {
  SP:'SE', RJ:'SE', MG:'SE', ES:'SE', PR:'S', SC:'S', RS:'S', DF:'CO', GO:'CO', MT:'CO', MS:'CO',
  BA:'NE', PE:'NE', CE:'NE', RN:'NE', PB:'NE', AL:'NE', SE:'NE', PI:'NE', MA:'NE',
  AM:'N', PA:'N', AC:'N', RO:'N', RR:'N', AP:'N', TO:'N'
};
const hspByRegion = { NE:5.5, CO:5.2, SE:5.1, N:4.6, S:4.4 };
const orientationFactor = { N:1, NE:.96, E:.90, S:.78 };
const shadeFactor = { none:1, light:.95, medium:.86, high:.72 };
const pricePerWp = kw => kw <= 2.5 ? 3.87 : kw <= 5 ? 2.84 : 2.31;
const nf0 = new Intl.NumberFormat('pt-BR', {maximumFractionDigits:0});
const nf1 = new Intl.NumberFormat('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1});
const money0 = new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL',maximumFractionDigits:0});

const state = { step:1, future:0, orientation:'N', shade:'none', panelCount:0 };
const els = {
  form: $('#solarForm'), consumption: $('#consumption'), bill: $('#bill'), state: $('#state'), roofArea: $('#roofArea'), roofType: $('#roofType'), coverage: $('#coverage'), coverageLabel: $('#coverageLabel'), panelPower: $('#panelPower'), losses: $('#losses'), lossesLabel: $('#lossesLabel'),
  liveSystemKw: $('#liveSystemKw'), livePanels: $('#livePanels'), liveGeneration: $('#liveGeneration'), liveCoverage: $('#liveCoverage'), areaUsed: $('#areaUsed'), areaAvailable: $('#areaAvailable'), areaMeter: $('#areaMeter'), coverageMeter: $('#coverageMeter'), panelGrid: $('#panelGrid'), houseStage: $('#houseStage'), roofShell: $('#roofShell'), roofWarning: $('#roofWarning'), warningPanels: $('#warningPanels'), warningCapacity: $('#warningCapacity'),
  resultKw: $('#resultKw'), resultPanelCount: $('#resultPanelCount'), resultMonthlyGen: $('#resultMonthlyGen'), resultAnnualGen: $('#resultAnnualGen'), resultArea: $('#resultArea'), resultSavings: $('#resultSavings'), resultInvestment: $('#resultInvestment'), resultPayback: $('#resultPayback'), resultFitText: $('#resultFitText'), resultNote: $('#resultNote'), wizardProgress: $('#wizardProgress')
};

function getModel() {
  const consumption = Math.max(50, Number(els.consumption.value) || 500);
  const bill = Math.max(0, Number(els.bill.value) || 0);
  const futureConsumption = consumption * (1 + state.future / 100);
  const coverage = Number(els.coverage.value) / 100;
  const region = stateRegion[els.state.value] || 'SE';
  const hsp = hspByRegion[region];
  const losses = Number(els.losses.value) / 100;
  const panelW = Number(els.panelPower.value);
  const oFactor = orientationFactor[state.orientation];
  const sFactor = shadeFactor[state.shade];
  const effectiveHsp = hsp * oFactor * sFactor;
  const targetGeneration = futureConsumption * coverage;
  const neededKw = targetGeneration / (effectiveHsp * 30 * (1 - losses));
  const panels = Math.max(1, Math.ceil((neededKw * 1000) / panelW));
  const installedKw = panels * panelW / 1000;
  const generation = installedKw * effectiveHsp * 30 * (1 - losses);
  const panelFootprint = 2.6;
  const requiredArea = panels * panelFootprint;
  const roofArea = Math.max(1, Number(els.roofArea.value) || 40);
  const capacity = Math.max(0, Math.floor(roofArea / panelFootprint));
  const fits = panels <= capacity;
  const actualCoverage = Math.min(generation / futureConsumption, 1.3) * 100;
  const tariff = consumption > 0 ? bill / consumption : 0;
  const monthlySavings = Math.min(generation, futureConsumption) * tariff * .90;
  const annualSavings = monthlySavings * 12;
  const basePrice = installedKw * 1000 * pricePerWp(installedKw);
  const installLow = basePrice * .90;
  const installHigh = basePrice * 1.18;
  const paybackLow = annualSavings > 0 ? installLow / annualSavings : 0;
  const paybackHigh = annualSavings > 0 ? installHigh / annualSavings : 0;
  return {consumption,bill,futureConsumption,coverage,hsp,losses,panelW,effectiveHsp,targetGeneration,neededKw,panels,installedKw,generation,requiredArea,roofArea,capacity,fits,actualCoverage,monthlySavings,annualSavings,installLow,installHigh,paybackLow,paybackHigh};
}

function setPanelCount(target) {
  const visualTarget = Math.min(target, 30);
  const current = els.panelGrid.children.length;
  if (visualTarget > current) {
    for (let i=current;i<visualTarget;i++) {
      const panel = document.createElement('i');
      panel.className = 'solar-panel';
      panel.style.animationDelay = `${Math.min((i-current)*35,350)}ms`;
      panel.title = `Módulo ${i+1}`;
      els.panelGrid.appendChild(panel);
    }
  } else if (visualTarget < current) {
    const remove = [...els.panelGrid.children].slice(visualTarget).reverse();
    remove.forEach((panel, idx) => {
      panel.classList.add('removing');
      setTimeout(() => panel.remove(), 170 + idx*8);
    });
  }
  state.panelCount = target;
}

function formatThousands(v){ return nf0.format(v); }
function formatCompactBRL(v){
  if(v >= 1000) return `R$ ${(v/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} mil`;
  return money0.format(v);
}

function updateVisual() {
  const m = getModel();
  setPanelCount(m.panels);
  els.liveSystemKw.textContent = `${m.installedKw.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} kWp`;
  els.livePanels.textContent = m.panels > 30 ? `30+ / ${m.panels}` : m.panels;
  els.liveGeneration.textContent = formatThousands(m.generation);
  els.liveCoverage.textContent = Math.round(Math.min(m.actualCoverage,100));
  els.areaUsed.textContent = nf1.format(m.requiredArea);
  els.areaAvailable.textContent = nf0.format(m.roofArea);
  const areaPct = Math.min(100, (m.requiredArea/m.roofArea)*100);
  els.areaMeter.style.width = `${areaPct}%`;
  els.areaMeter.style.background = m.fits ? '' : 'linear-gradient(90deg,#d78566,#ff9a75)';
  els.coverageMeter.style.width = `${Math.min(100,m.actualCoverage)}%`;
  els.roofWarning.classList.toggle('show', !m.fits);
  els.warningPanels.textContent = m.panels;
  els.warningCapacity.textContent = m.capacity;
  els.houseStage.classList.remove('shade-light','shade-medium','shade-high');
  if(state.shade !== 'none') els.houseStage.classList.add(`shade-${state.shade}`);
  els.roofShell.classList.remove('orientation-N','orientation-NE','orientation-E','orientation-S');
  els.roofShell.classList.add(`orientation-${state.orientation}`);

  els.resultKw.innerHTML = `${m.installedKw.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} <span>kWp</span>`;
  els.resultPanelCount.textContent = m.panels;
  els.resultMonthlyGen.textContent = `${formatThousands(m.generation)} kWh`;
  els.resultAnnualGen.textContent = `${formatThousands(m.generation*12)} kWh`;
  els.resultArea.textContent = `${nf1.format(m.requiredArea)} m²`;
  els.resultSavings.textContent = `${money0.format(m.monthlySavings)}/mês`;
  els.resultInvestment.textContent = `${formatCompactBRL(m.installLow)} – ${formatCompactBRL(m.installHigh).replace('R$ ','')}`;
  els.resultPayback.textContent = m.annualSavings > 0 ? `${m.paybackLow.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} – ${m.paybackHigh.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} anos` : '—';
  els.resultFitText.textContent = m.fits ? `Cabe na área informada, usando cerca de ${Math.round((m.requiredArea/m.roofArea)*100)}% do espaço.` : `Atenção: faltam cerca de ${nf1.format(m.requiredArea-m.roofArea)} m² de área útil.`;
  els.resultFitText.style.color = m.fits ? '' : '#ffc7ba';
  els.coverageLabel.textContent = `${els.coverage.value}%`;
  els.lossesLabel.textContent = els.losses.value;
}

function goStep(step, scroll=true) {
  state.step = Math.min(4, Math.max(1, step));
  $$('.wizard-step').forEach(s => s.classList.toggle('active', Number(s.dataset.step) === state.step));
  $$('.step-dot').forEach((d,i) => {d.classList.toggle('active',i+1===state.step);d.classList.toggle('done',i+1<state.step)});
  els.wizardProgress.textContent = `${state.step} de 4`;
  updateVisual();
  if(scroll && window.innerWidth < 641) $('.wizard-panel').scrollIntoView({behavior:'smooth',block:'start'});
}

$$('.next-step').forEach(btn => btn.addEventListener('click', () => {
  if(state.step === 1 && (!els.consumption.checkValidity() || !els.bill.checkValidity())) { els.form.reportValidity(); return; }
  if(state.step === 2 && !els.roofArea.checkValidity()) { els.form.reportValidity(); return; }
  goStep(state.step+1);
}));
$$('.back-step').forEach(btn => btn.addEventListener('click', () => goStep(state.step-1)));
$$('[data-go-step]').forEach(btn => btn.addEventListener('click',()=> goStep(Number(btn.dataset.goStep))));

$$('#futureLoadGroup button').forEach(btn => btn.addEventListener('click',()=>{
  state.future = Number(btn.dataset.future); $$('#futureLoadGroup button').forEach(b=>b.classList.toggle('selected',b===btn)); updateVisual();
}));
$$('#orientationGroup button').forEach(btn => btn.addEventListener('click',()=>{
  state.orientation = btn.dataset.orientation; $$('#orientationGroup button').forEach(b=>b.classList.toggle('selected',b===btn)); updateVisual();
}));
$$('#shadeGroup button').forEach(btn => btn.addEventListener('click',()=>{
  state.shade = btn.dataset.shade; $$('#shadeGroup button').forEach(b=>b.classList.toggle('selected',b===btn)); updateVisual();
}));
[els.consumption,els.bill,els.state,els.roofArea,els.roofType,els.coverage,els.panelPower,els.losses].forEach(el => el.addEventListener('input', updateVisual));
els.form.addEventListener('submit',e=>e.preventDefault());

const menuBtn = $('.menu-button'), mobileMenu = $('#mobileMenu');
menuBtn.addEventListener('click',()=>{const open=mobileMenu.classList.toggle('open');menuBtn.classList.toggle('active',open);menuBtn.setAttribute('aria-expanded',String(open));});
$$('#mobileMenu a').forEach(a=>a.addEventListener('click',()=>{mobileMenu.classList.remove('open');menuBtn.classList.remove('active');menuBtn.setAttribute('aria-expanded','false');}));

document.addEventListener('click',e=>{if(!mobileMenu.contains(e.target)&&!menuBtn.contains(e.target)){mobileMenu.classList.remove('open');menuBtn.classList.remove('active');menuBtn.setAttribute('aria-expanded','false');}});

$('#contactForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(!e.currentTarget.reportValidity()) return;
  $('#formSuccess').classList.add('show');
  e.currentTarget.querySelector('button[type=submit]').innerHTML='Solicitação registrada <span>✓</span>';
});

const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
$$('.reveal').forEach(el=>observer.observe(el));

const sticky = $('.sticky-mobile-cta');
const simulatorObserver = new IntersectionObserver(entries=>{entries.forEach(entry=>sticky.classList.toggle('hidden',entry.isIntersecting))},{threshold:.08});
simulatorObserver.observe($('#simulador'));

$('#year').textContent = new Date().getFullYear();
updateVisual();
goStep(1,false);
