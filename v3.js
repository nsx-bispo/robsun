const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const phrases = [
  'ganhar forma.',
  'ser dimensionado em tempo real.',
  'mostrar quantos painéis você precisa.',
  'estimar sua economia mensal.'
];

const stateRegion = {
  SP:'SE', RJ:'SE', MG:'SE', ES:'SE', PR:'S', SC:'S', RS:'S', DF:'CO', GO:'CO', MT:'CO', MS:'CO',
  BA:'NE', PE:'NE', CE:'NE', RN:'NE', PB:'NE', AL:'NE', SE:'NE', PI:'NE', MA:'NE',
  AM:'N', PA:'N', AC:'N', RO:'N', RR:'N', AP:'N', TO:'N'
};
const hspByRegion = { NE:5.5, CO:5.2, SE:5.1, N:4.6, S:4.4 };
const orientationFactor = { N:1, NE:.96, E:.90, S:.78 };
const shadeFactor = { none:1, light:.95, medium:.86, high:.72 };
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const money0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const appState = { step: 1, future: 0, orientation: 'N', shade: 'none' };

const els = {
  form: $('#solarForm'),
  consumption: $('#consumption'), bill: $('#bill'), state: $('#state'), roofArea: $('#roofArea'), roofType: $('#roofType'),
  coverage: $('#coverage'), coverageLabel: $('#coverageLabel'), panelPower: $('#panelPower'), losses: $('#losses'), lossesLabel: $('#lossesLabel'),
  liveSystemKw: $('#liveSystemKw'), livePanels: $('#livePanels'), liveGeneration: $('#liveGeneration'), liveCoverage: $('#liveCoverage'),
  areaUsed: $('#areaUsed'), areaAvailable: $('#areaAvailable'), areaMeter: $('#areaMeter'), coverageMeter: $('#coverageMeter'),
  coverageMeterText: $('#coverageMeterText'), panelGrid: $('#panelGrid'), roofWarning: $('#roofWarning'), warningPanels: $('#warningPanels'), warningCapacity: $('#warningCapacity'),
  resultKw: $('#resultKw'), resultPanelCount: $('#resultPanelCount'), resultMonthlyGen: $('#resultMonthlyGen'), resultAnnualGen: $('#resultAnnualGen'),
  resultArea: $('#resultArea'), resultSavings: $('#resultSavings'), resultInvestment: $('#resultInvestment'), resultPayback: $('#resultPayback'), resultFitText: $('#resultFitText'), resultNote: $('#resultNote'),
  wizardProgress: $('#wizardProgress'), houseStage: $('#houseStage'), roofShell: $('#roofShell'), formSuccess: $('#formSuccess')
};

function priceRangePerWp(installedKw) {
  const center = 2.45;
  const lowFactor = installedKw >= 5 ? 0.9 : 0.96;
  const highFactor = installedKw <= 3 ? 1.24 : 1.16;
  return { low: center * lowFactor, high: center * highFactor };
}

function getModel() {
  const consumption = Math.max(50, Number(els.consumption.value) || 500);
  const bill = Math.max(0, Number(els.bill.value) || 550);
  const futureConsumption = consumption * (1 + appState.future / 100);
  const coverage = Number(els.coverage.value) / 100;
  const region = stateRegion[els.state.value] || 'SE';
  const hsp = hspByRegion[region];
  const losses = Number(els.losses.value) / 100;
  const panelW = Number(els.panelPower.value);
  const oFactor = orientationFactor[appState.orientation];
  const sFactor = shadeFactor[appState.shade];
  const effectiveHsp = hsp * oFactor * sFactor;
  const targetGeneration = futureConsumption * coverage;
  const neededKw = targetGeneration / (effectiveHsp * 30 * (1 - losses));
  const panels = Math.max(1, Math.ceil((neededKw * 1000) / panelW));
  const installedKw = panels * panelW / 1000;
  const generation = installedKw * effectiveHsp * 30 * (1 - losses);
  const panelFootprint = 2.6;
  const requiredArea = panels * panelFootprint;
  const roofArea = Math.max(1, Number(els.roofArea.value) || 40);
  const capacity = Math.floor(roofArea / panelFootprint);
  const fits = panels <= capacity;
  const actualCoverage = Math.min((generation / futureConsumption) * 100, 130);
  const tariff = consumption > 0 ? bill / consumption : 0;
  const monthlySavings = Math.min(generation, futureConsumption) * tariff * 0.90;
  const annualSavings = monthlySavings * 12;
  const range = priceRangePerWp(installedKw);
  const installLow = installedKw * 1000 * range.low;
  const installHigh = installedKw * 1000 * range.high;
  const paybackLow = annualSavings ? installLow / annualSavings : 0;
  const paybackHigh = annualSavings ? installHigh / annualSavings : 0;
  return { consumption, futureConsumption, bill, coverage, hsp, losses, panelW, effectiveHsp, targetGeneration, panels, installedKw, generation, requiredArea, roofArea, capacity, fits, actualCoverage, monthlySavings, annualSavings, installLow, installHigh, paybackLow, paybackHigh };
}

function setPanelCount(rootEl, target, maxVisual = 24) {
  if (!rootEl) return;
  const visualTarget = Math.min(target, maxVisual);
  const current = rootEl.children.length;
  if (visualTarget > current) {
    for (let i = current; i < visualTarget; i++) {
      const panel = document.createElement('i');
      panel.className = 'solar-panel';
      panel.style.animationDelay = `${Math.min((i - current) * 35, 280)}ms`;
      rootEl.appendChild(panel);
    }
  } else if (visualTarget < current) {
    [...rootEl.children].slice(visualTarget).reverse().forEach((panel, idx) => {
      panel.classList.add('removing');
      setTimeout(() => panel.remove(), 140 + idx * 8);
    });
  }
}

function compactMoney(v) {
  if (v >= 1000) return `R$ ${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
  return money0.format(v);
}

function updateVisual() {
  const m = getModel();
  setPanelCount($('#heroRoofGrid'), Math.min(m.panels, 10), 10);
  setPanelCount(els.panelGrid, m.panels, 30);

  els.liveSystemKw.textContent = `${m.installedKw.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`;
  els.livePanels.textContent = m.panels > 30 ? `30+ / ${m.panels}` : String(m.panels);
  els.liveGeneration.textContent = nf0.format(m.generation);
  els.liveCoverage.textContent = String(Math.round(Math.min(m.actualCoverage, 100)));
  els.areaUsed.textContent = nf1.format(m.requiredArea);
  els.areaAvailable.textContent = nf0.format(m.roofArea);
  els.coverageLabel.textContent = `${els.coverage.value}%`;
  els.lossesLabel.textContent = els.losses.value;
  if (els.coverageMeterText) els.coverageMeterText.textContent = `${Math.round(Math.min(m.actualCoverage, 100))}%`;

  const areaPct = Math.min((m.requiredArea / m.roofArea) * 100, 100);
  const coveragePct = Math.min(m.actualCoverage, 100);
  els.areaMeter.style.width = `${areaPct}%`;
  els.areaMeter.style.background = m.fits ? '' : 'linear-gradient(90deg,#d27b61,#ff9a75)';
  els.coverageMeter.style.width = `${coveragePct}%`;

  els.roofWarning.classList.toggle('show', !m.fits);
  els.warningPanels.textContent = String(m.panels);
  els.warningCapacity.textContent = String(Math.max(m.capacity, 0));

  els.houseStage.classList.remove('shade-light', 'shade-medium', 'shade-high');
  if (appState.shade !== 'none') els.houseStage.classList.add(`shade-${appState.shade}`);
  els.roofShell.classList.remove('orientation-N', 'orientation-NE', 'orientation-E', 'orientation-S');
  els.roofShell.classList.add(`orientation-${appState.orientation}`);

  els.resultKw.innerHTML = `${m.installedKw.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span>kWp</span>`;
  els.resultPanelCount.textContent = String(m.panels);
  els.resultMonthlyGen.textContent = `${nf0.format(m.generation)} kWh`;
  els.resultAnnualGen.textContent = `${nf0.format(m.generation * 12)} kWh`;
  els.resultArea.textContent = `${nf1.format(m.requiredArea)} m²`;
  els.resultSavings.textContent = `${money0.format(m.monthlySavings)}/mês`;
  els.resultInvestment.textContent = `${compactMoney(m.installLow)} – ${compactMoney(m.installHigh).replace('R$ ', '')}`;
  els.resultPayback.textContent = m.annualSavings > 0 ? `${m.paybackLow.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} – ${m.paybackHigh.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} anos` : '—';
  els.resultFitText.textContent = m.fits
    ? `Cabe na área informada (${Math.round((m.requiredArea / m.roofArea) * 100)}% de ocupação).`
    : `Área insuficiente: faltam cerca de ${nf1.format(m.requiredArea - m.roofArea)} m² úteis.`;
  els.resultFitText.style.color = m.fits ? '' : '#b44d2f';
  els.resultNote.textContent = 'Valores financeiros são indicativos. A proposta final depende de vistoria, estrutura, padrão elétrico, materiais e equipamentos.';
}

function goStep(step, scroll = true) {
  appState.step = Math.min(4, Math.max(1, step));
  $$('.wizard-step').forEach(section => section.classList.toggle('active', Number(section.dataset.step) === appState.step));
  $$('.step-dot').forEach((dot, index) => {
    dot.classList.toggle('active', index + 1 === appState.step);
    dot.classList.toggle('done', index + 1 < appState.step);
  });
  els.wizardProgress.textContent = `${appState.step} de 4`;
  if (scroll && window.innerWidth < 980) $('.wizard-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function startTypewriter() {
  const el = $('#typewriter');
  if (!el) return;
  let p = 0, c = 0, deleting = false;
  const tick = () => {
    const phrase = phrases[p];
    el.textContent = deleting ? phrase.slice(0, c--) : phrase.slice(0, c++);
    let delay = deleting ? 35 : 55;
    if (!deleting && c > phrase.length) { deleting = true; delay = 1400; c = phrase.length; }
    else if (deleting && c < 0) { deleting = false; p = (p + 1) % phrases.length; delay = 300; c = 0; }
    setTimeout(tick, delay);
  };
  tick();
}

$$('.next-step').forEach(btn => btn.addEventListener('click', () => {
  if (appState.step === 1 && (!els.consumption.checkValidity() || !els.bill.checkValidity())) return els.form.reportValidity();
  if (appState.step === 2 && !els.roofArea.checkValidity()) return els.form.reportValidity();
  goStep(appState.step + 1);
}));
$$('.back-step').forEach(btn => btn.addEventListener('click', () => goStep(appState.step - 1)));
$$('[data-go-step]').forEach(btn => btn.addEventListener('click', () => goStep(Number(btn.dataset.goStep))));

$$('#futureLoadGroup button').forEach(btn => btn.addEventListener('click', () => {
  appState.future = Number(btn.dataset.future);
  $$('#futureLoadGroup button').forEach(b => b.classList.toggle('selected', b === btn));
  updateVisual();
}));
$$('#orientationGroup button').forEach(btn => btn.addEventListener('click', () => {
  appState.orientation = btn.dataset.orientation;
  $$('#orientationGroup button').forEach(b => b.classList.toggle('selected', b === btn));
  updateVisual();
}));
$$('#shadeGroup button').forEach(btn => btn.addEventListener('click', () => {
  appState.shade = btn.dataset.shade;
  $$('#shadeGroup button').forEach(b => b.classList.toggle('selected', b === btn));
  updateVisual();
}));
[els.consumption, els.bill, els.state, els.roofArea, els.roofType, els.coverage, els.panelPower, els.losses].forEach(el => el.addEventListener('input', updateVisual));
els.form.addEventListener('submit', e => e.preventDefault());

const menuBtn = $('.menu-button');
const mobileMenu = $('#mobileMenu');
menuBtn.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  menuBtn.classList.toggle('active', open);
  menuBtn.setAttribute('aria-expanded', String(open));
});
$$('#mobileMenu a').forEach(a => a.addEventListener('click', () => {
  mobileMenu.classList.remove('open');
  menuBtn.classList.remove('active');
  menuBtn.setAttribute('aria-expanded', 'false');
}));

document.addEventListener('click', e => {
  if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
    mobileMenu.classList.remove('open');
    menuBtn.classList.remove('active');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
});

$('#contactForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!e.currentTarget.reportValidity()) return;
  els.formSuccess.classList.add('show');
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .12 });
$$('.reveal').forEach(el => revealObserver.observe(el));

const sticky = $('.sticky-mobile-cta');
const simObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => sticky.classList.toggle('hidden', entry.isIntersecting));
}, { threshold: .08 });
simObserver.observe($('#simulador'));

$('#year').textContent = new Date().getFullYear();
startTypewriter();
updateVisual();
goStep(1, false);
