const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TYPEWRITER_PHRASES = [
  'ganhar forma.',
  'reduzir seus custos.',
  'gerar sua própria energia.',
  'trabalhar por você todos os dias.'
];

const STATE_REGION = {
  SP:'SE', RJ:'SE', MG:'SE', ES:'SE', PR:'S', SC:'S', RS:'S', DF:'CO', GO:'CO', MT:'CO', MS:'CO',
  BA:'NE', PE:'NE', CE:'NE', RN:'NE', PB:'NE', AL:'NE', SE:'NE', PI:'NE', MA:'NE',
  AM:'N', PA:'N', AC:'N', RO:'N', RR:'N', AP:'N', TO:'N'
};

const HSP_BY_REGION = { NE:5.5, CO:5.2, SE:5.1, N:4.6, S:4.4 };
const ORIENTATION_FACTOR = { N:1.00, NE:0.96, E:0.90, S:0.78 };
const SHADE_FACTOR = { none:1.00, light:0.95, medium:0.86, high:0.72 };
const ORIENTATION_LABEL = { N:'Norte', NE:'NE / NO', E:'Leste / Oeste', S:'Sul' };
const SHADE_LABEL = { none:'Nenhuma', light:'Leve', medium:'Média', high:'Alta' };
const COMPASS_ANGLE = { N:0, NE:45, E:90, S:180 };
const ROOF_ROTATION = { N:-21, NE:-10, E:2, S:18 };
const SHADE_OPACITY = { none:0, light:0.09, medium:0.20, high:0.34 };
const PANEL_AREA_M2 = { 550:2.55, 585:2.58, 610:2.62, 700:3.10 };
const MARKET_REFERENCE_BRL_PER_WP = 2.45;

const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits:0 });
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 });
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
const brl0 = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 });

const state = { step:1, future:0, orientation:'N', shade:'none' };

const els = {
  form: $('#solarForm'), consumption: $('#consumption'), bill: $('#bill'), state: $('#state'), roofArea: $('#roofArea'), roofType: $('#roofType'),
  coverage: $('#coverage'), coverageLabel: $('#coverageLabel'), panelPower: $('#panelPower'), losses: $('#losses'), lossesLabel: $('#lossesLabel'),
  wizardProgress: $('#wizardProgress'), roofStage: $('#roofStage'), roofShell: $('#roofShell'), panelGrid: $('#panelGrid'), panelOverflow: $('#panelOverflow'),
  compassArrow: $('#compassArrow'), orientationText: $('#orientationText'), shadeText: $('#shadeText'), solarResourceText: $('#solarResourceText'),
  roofWarning: $('#roofWarning'), warningRequiredArea: $('#warningRequiredArea'), warningAvailableArea: $('#warningAvailableArea'),
  liveSystemKw: $('#liveSystemKw'), livePanels: $('#livePanels'), liveGeneration: $('#liveGeneration'), liveCoverage: $('#liveCoverage'),
  areaUsed: $('#areaUsed'), areaAvailable: $('#areaAvailable'), areaMeter: $('#areaMeter'),
  resultKw: $('#resultKw'), resultCoverageText: $('#resultCoverageText'), resultPanelCount: $('#resultPanelCount'), resultPanelPower: $('#resultPanelPower'),
  resultMonthlyGen: $('#resultMonthlyGen'), resultAnnualGen: $('#resultAnnualGen'), resultArea: $('#resultArea'), resultSavings: $('#resultSavings'),
  resultInvestment: $('#resultInvestment'), resultPayback: $('#resultPayback'), resultFitText: $('#resultFitText'), formSuccess: $('#formSuccess'),
  leadProjectSummary: $('#leadProjectSummary')
};

function marketRangePerWp(installedKw) {
  const sizeAdjustment = installedKw <= 3 ? 1.08 : installedKw >= 8 ? 0.94 : 1;
  const center = MARKET_REFERENCE_BRL_PER_WP * sizeAdjustment;
  return { low:center * 0.86, high:center * 1.20 };
}

function getModel() {
  const consumption = Math.max(50, Number(els.consumption.value) || 500);
  const bill = Math.max(0, Number(els.bill.value) || 0);
  const futureConsumption = consumption * (1 + state.future / 100);
  const targetFraction = Number(els.coverage.value) / 100;
  const region = STATE_REGION[els.state.value] || 'SE';
  const hsp = HSP_BY_REGION[region];
  const lossesFraction = Number(els.losses.value) / 100;
  const panelW = Number(els.panelPower.value);
  const orientationFactor = ORIENTATION_FACTOR[state.orientation];
  const shadeFactor = SHADE_FACTOR[state.shade];

  const effectiveSolarHours = hsp * orientationFactor * shadeFactor;
  const targetMonthlyGeneration = futureConsumption * targetFraction;
  const rawRequiredKw = targetMonthlyGeneration / (effectiveSolarHours * 30 * (1 - lossesFraction));
  const panels = Math.max(1, Math.ceil((rawRequiredKw * 1000) / panelW));
  const installedKw = (panels * panelW) / 1000;
  const monthlyGeneration = installedKw * effectiveSolarHours * 30 * (1 - lossesFraction);
  const actualEnergyCoverage = Math.min((monthlyGeneration / futureConsumption) * 100, 150);

  const panelArea = PANEL_AREA_M2[panelW] || 2.60;
  const minimumModuleArea = panels * panelArea;
  const roofArea = Math.max(1, Number(els.roofArea.value) || 40);
  const fits = minimumModuleArea <= roofArea;

  const apparentTariff = consumption > 0 ? bill / consumption : 0;
  const monthlyGrossSavings = Math.min(monthlyGeneration, futureConsumption) * apparentTariff;
  const annualGrossSavings = monthlyGrossSavings * 12;

  const priceRange = marketRangePerWp(installedKw);
  const investmentLow = installedKw * 1000 * priceRange.low;
  const investmentHigh = installedKw * 1000 * priceRange.high;
  const simplePaybackLow = annualGrossSavings > 0 ? investmentLow / annualGrossSavings : 0;
  const simplePaybackHigh = annualGrossSavings > 0 ? investmentHigh / annualGrossSavings : 0;

  return {
    consumption, futureConsumption, targetFraction, region, hsp, lossesFraction, panelW, effectiveSolarHours,
    panels, installedKw, monthlyGeneration, actualEnergyCoverage, panelArea, minimumModuleArea, roofArea, fits,
    apparentTariff, monthlyGrossSavings, annualGrossSavings, investmentLow, investmentHigh, simplePaybackLow, simplePaybackHigh
  };
}

function compactBrl(value) {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 })} mil`;
  return brl0.format(value);
}

function animateNumber(el, target, formatter, duration = 360) {
  if (!el) return;
  if (el._animationFrame) cancelAnimationFrame(el._animationFrame);
  const start = Number(el.dataset.value || 0);
  el.dataset.value = String(target);
  if (prefersReducedMotion || !Number.isFinite(start)) {
    el.textContent = formatter(target);
    return;
  }
  const started = performance.now();
  const delta = target - start;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const frame = now => {
    const progress = Math.min(1, (now - started) / duration);
    el.textContent = formatter(start + delta * easeOut(progress));
    if (progress < 1) el._animationFrame = requestAnimationFrame(frame);
    else el._animationFrame = null;
  };
  el._animationFrame = requestAnimationFrame(frame);
}

function setPanelCount(target) {
  const maxVisual = 24;
  [...els.panelGrid.querySelectorAll('.removing')].forEach(panel => panel.remove());
  const visualTarget = Math.min(target, maxVisual);
  const current = els.panelGrid.children.length;
  const cols = Math.max(2, Math.min(6, Math.ceil(Math.sqrt(Math.max(visualTarget, 1) * 1.45))));
  els.panelGrid.style.setProperty('--cols', cols);

  if (visualTarget > current) {
    for (let i = current; i < visualTarget; i++) {
      const panel = document.createElement('i');
      panel.className = 'solar-panel';
      panel.style.animationDelay = `${Math.min((i - current) * 28, 260)}ms`;
      panel.setAttribute('aria-hidden', 'true');
      els.panelGrid.appendChild(panel);
    }
  } else if (visualTarget < current) {
    [...els.panelGrid.children].slice(visualTarget).reverse().forEach((panel, index) => {
      panel.classList.add('removing');
      setTimeout(() => panel.remove(), 150 + index * 7);
    });
  }

  const hidden = Math.max(0, target - maxVisual);
  els.panelOverflow.textContent = hidden ? `+${hidden} módulos no arranjo` : '';
  els.panelOverflow.classList.toggle('show', hidden > 0);
}

function updateScene(model) {
  setPanelCount(model.panels);
  els.roofStage.style.setProperty('--shade-opacity', SHADE_OPACITY[state.shade]);
  els.compassArrow.style.setProperty('--compass-angle', `${COMPASS_ANGLE[state.orientation]}deg`);
  els.compassArrow.style.transform = `rotate(${COMPASS_ANGLE[state.orientation]}deg)`;
  els.roofShell.style.setProperty('--roof-rotation', `${ROOF_ROTATION[state.orientation]}deg`);
  els.orientationText.textContent = ORIENTATION_LABEL[state.orientation];
  els.shadeText.textContent = SHADE_LABEL[state.shade];
  els.solarResourceText.textContent = `≈ ${nf1.format(model.hsp)} kWh/m².dia`;

  els.roofWarning.classList.toggle('show', !model.fits);
  els.warningRequiredArea.textContent = nf1.format(model.minimumModuleArea);
  els.warningAvailableArea.textContent = nf1.format(model.roofArea);

  const areaPercent = Math.min(100, (model.minimumModuleArea / model.roofArea) * 100);
  els.areaMeter.style.width = `${areaPercent}%`;
  els.areaMeter.style.background = model.fits ? '' : 'linear-gradient(90deg,#bd5b42,#f39a79)';

  animateNumber(els.liveSystemKw, model.installedKw, value => `${nf2.format(value)} kWp`);
  animateNumber(els.livePanels, model.panels, value => nf0.format(Math.round(value)));
  animateNumber(els.liveGeneration, model.monthlyGeneration, value => nf0.format(value));
  animateNumber(els.liveCoverage, Math.min(100, model.actualEnergyCoverage), value => nf0.format(value));
  animateNumber(els.areaUsed, model.minimumModuleArea, value => nf1.format(value));
  animateNumber(els.areaAvailable, model.roofArea, value => nf1.format(value));
}

function updateResults(model) {
  els.coverageLabel.textContent = `${els.coverage.value}%`;
  els.lossesLabel.textContent = els.losses.value;

  els.resultKw.innerHTML = `${nf2.format(model.installedKw)} <small>kWp</small>`;
  els.resultCoverageText.textContent = `Meta energética de ${Math.round(model.targetFraction * 100)}%`;
  els.resultPanelCount.textContent = nf0.format(model.panels);
  els.resultPanelPower.textContent = `${model.panelW} W por módulo`;
  els.resultMonthlyGen.textContent = `${nf0.format(model.monthlyGeneration)} kWh`;
  els.resultAnnualGen.textContent = `${nf0.format(model.monthlyGeneration * 12)} kWh`;
  els.resultArea.textContent = `${nf1.format(model.minimumModuleArea)} m²`;
  els.resultSavings.textContent = `${brl0.format(model.monthlyGrossSavings)}/mês`;
  els.resultInvestment.textContent = `${compactBrl(model.investmentLow)} – ${compactBrl(model.investmentHigh).replace('R$ ', '')}`;
  els.resultPayback.textContent = model.annualGrossSavings > 0
    ? `${model.simplePaybackLow.toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 })} – ${model.simplePaybackHigh.toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 })} anos`
    : '—';
  els.resultFitText.textContent = model.fits
    ? `Compatível com a área útil informada.`
    : `Área insuficiente: faltam ≈ ${nf1.format(model.minimumModuleArea - model.roofArea)} m².`;
  els.resultFitText.style.color = model.fits ? '' : '#a6452f';
  if (els.leadProjectSummary) {
    els.leadProjectSummary.innerHTML = `<span>Sua simulação atual</span><strong>${nf2.format(model.installedKw)} kWp • ${nf0.format(model.panels)} módulos • ≈ ${nf0.format(model.monthlyGeneration)} kWh/mês</strong>`;
  }
}

function updateVisual() {
  const model = getModel();
  updateScene(model);
  updateResults(model);
}

function goStep(nextStep, shouldScroll = true) {
  state.step = Math.min(4, Math.max(1, nextStep));
  $$('.wizard-step').forEach(step => step.classList.toggle('active', Number(step.dataset.step) === state.step));
  $$('.step-dot').forEach((dot, index) => {
    dot.classList.toggle('active', index + 1 === state.step);
    dot.classList.toggle('done', index + 1 < state.step);
  });
  els.wizardProgress.textContent = `${state.step} de 4`;
  if (shouldScroll && window.innerWidth < 960) $('.wizard-card').scrollIntoView({ behavior:prefersReducedMotion ? 'auto' : 'smooth', block:'start' });
}

function startTypewriter() {
  const el = $('#typewriter');
  if (!el) return;
  if (prefersReducedMotion) {
    el.textContent = TYPEWRITER_PHRASES[0];
    return;
  }

  let phraseIndex = 0;
  let charIndex = TYPEWRITER_PHRASES[0].length;
  let deleting = true;
  el.textContent = TYPEWRITER_PHRASES[0];

  const tick = () => {
    const phrase = TYPEWRITER_PHRASES[phraseIndex];
    if (deleting) {
      charIndex -= 1;
      el.textContent = phrase.slice(0, Math.max(0, charIndex));
      if (charIndex <= 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % TYPEWRITER_PHRASES.length;
        setTimeout(tick, 260);
        return;
      }
      setTimeout(tick, 28 + Math.random() * 18);
      return;
    }

    const nextPhrase = TYPEWRITER_PHRASES[phraseIndex];
    charIndex += 1;
    el.textContent = nextPhrase.slice(0, charIndex);
    if (charIndex >= nextPhrase.length) {
      deleting = true;
      setTimeout(tick, 1500);
      return;
    }
    setTimeout(tick, 42 + Math.random() * 25);
  };

  setTimeout(tick, 1500);
}

$$('.next-step').forEach(button => button.addEventListener('click', () => {
  if (state.step === 1 && (!els.consumption.checkValidity() || !els.bill.checkValidity())) {
    els.form.reportValidity();
    return;
  }
  if (state.step === 2 && !els.roofArea.checkValidity()) {
    els.form.reportValidity();
    return;
  }
  goStep(state.step + 1);
}));

$$('.back-step').forEach(button => button.addEventListener('click', () => goStep(state.step - 1)));

$$('#futureLoadGroup button').forEach(button => button.addEventListener('click', () => {
  state.future = Number(button.dataset.future);
  $$('#futureLoadGroup button').forEach(item => item.classList.toggle('selected', item === button));
  updateVisual();
}));

$$('#orientationGroup button').forEach(button => button.addEventListener('click', () => {
  state.orientation = button.dataset.orientation;
  $$('#orientationGroup button').forEach(item => item.classList.toggle('selected', item === button));
  updateVisual();
}));

$$('#shadeGroup button').forEach(button => button.addEventListener('click', () => {
  state.shade = button.dataset.shade;
  $$('#shadeGroup button').forEach(item => item.classList.toggle('selected', item === button));
  updateVisual();
}));

[els.consumption, els.bill, els.state, els.roofArea, els.roofType, els.coverage, els.panelPower, els.losses]
  .forEach(input => input.addEventListener('input', updateVisual));

els.form.addEventListener('submit', event => event.preventDefault());

const menuButton = $('.menu-button');
const mobileMenu = $('#mobileMenu');
menuButton.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  menuButton.classList.toggle('active', open);
  menuButton.setAttribute('aria-expanded', String(open));
});
$$('#mobileMenu a').forEach(link => link.addEventListener('click', () => {
  mobileMenu.classList.remove('open');
  menuButton.classList.remove('active');
  menuButton.setAttribute('aria-expanded', 'false');
}));

document.addEventListener('click', event => {
  if (!mobileMenu.contains(event.target) && !menuButton.contains(event.target)) {
    mobileMenu.classList.remove('open');
    menuButton.classList.remove('active');
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

$('#contactForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  els.formSuccess.classList.add('show');
  event.currentTarget.querySelector('button[type="submit"]').textContent = 'Solicitação registrada ✓';
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold:0.12 });
$$('.reveal').forEach(element => revealObserver.observe(element));

const stickyCta = $('.sticky-mobile-cta');
const simulatorObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => stickyCta.classList.toggle('hidden', entry.isIntersecting));
}, { threshold:0.08 });
simulatorObserver.observe($('#simulador'));

$('#year').textContent = new Date().getFullYear();
startTypewriter();
updateVisual();
goStep(1, false);
