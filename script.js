const form = document.getElementById('solarForm');
const steps = [...document.querySelectorAll('.calc-step')];
const results = document.getElementById('results');
const coverage = document.getElementById('coverage');
const coverageLabel = document.getElementById('coverageLabel');
const progressBar = document.getElementById('progressBar');
const stepLabel = document.getElementById('stepLabel');
const stepTitle = document.getElementById('stepTitle');
const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.getElementById('mobileMenu');
let currentStep = 1;

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0
});

const numberBR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function compactBRL(value) {
  if (value >= 1000) return `R$ ${numberBR.format(value / 1000)} mil`;
  return brl.format(value);
}

function updateStepUI() {
  steps.forEach(step => step.classList.toggle('active', Number(step.dataset.step) === currentStep));
  results.classList.remove('visible');
  form.hidden = false;
  document.querySelector('.calc-progress').hidden = false;
  stepLabel.textContent = `Passo ${currentStep} de 2`;
  stepTitle.textContent = currentStep === 1 ? 'Seu consumo' : 'Seu imóvel';
  progressBar.style.width = currentStep === 1 ? '50%' : '100%';
}

function fieldsAreValid(ids) {
  return ids.every(id => {
    const field = document.getElementById(id);
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
    return true;
  });
}

function calculateSolar(event) {
  if (event) event.preventDefault();
  if (!fieldsAreValid(['consumption', 'bill'])) return;

  const consumption = Math.max(50, Number(document.getElementById('consumption').value) || 0);
  const bill = Math.max(0, Number(document.getElementById('bill').value) || 0);
  const peakSunHours = Number(document.getElementById('region').value);
  const panelPowerW = Number(document.getElementById('panelPower').value);
  const targetCoverage = Number(coverage.value) / 100;

  const performanceRatio = 0.80;
  const panelAreaM2 = 2.55;
  const monthlyGenerationPerKwp = peakSunHours * 30 * performanceRatio;
  const targetGeneration = consumption * targetCoverage;
  const requiredPowerKwp = targetGeneration / monthlyGenerationPerKwp;

  const panels = Math.max(1, Math.ceil((requiredPowerKwp * 1000) / panelPowerW));
  const installedPowerKwp = (panels * panelPowerW) / 1000;
  const monthlyGeneration = installedPowerKwp * monthlyGenerationPerKwp;
  const estimatedArea = panels * panelAreaM2;

  const practicalCoverage = Math.min(monthlyGeneration / consumption, 1);
  const monthlySavings = bill * Math.min(practicalCoverage, 0.90);
  const annualSavings = monthlySavings * 12;

  const lowInvestment = installedPowerKwp * 3600;
  const highInvestment = installedPowerKwp * 5000;
  const paybackLow = annualSavings > 0 ? lowInvestment / annualSavings : 0;
  const paybackHigh = annualSavings > 0 ? highInvestment / annualSavings : 0;

  document.getElementById('systemPower').innerHTML = `${numberBR.format(installedPowerKwp)} <span>kWp</span>`;
  document.getElementById('coverageResult').textContent = `para compensar aproximadamente ${coverage.value}% do consumo informado`;
  document.getElementById('panels').textContent = panels;
  document.getElementById('generation').textContent = Math.round(monthlyGeneration).toLocaleString('pt-BR');
  document.getElementById('area').textContent = Math.ceil(estimatedArea).toLocaleString('pt-BR');
  document.getElementById('savings').textContent = `${brl.format(monthlySavings)}/mês`;
  document.getElementById('investment').textContent = `${compactBRL(lowInvestment)} – ${compactBRL(highInvestment)}`;
  document.getElementById('payback').textContent = annualSavings > 0
    ? `${numberBR.format(paybackLow)} – ${numberBR.format(paybackHigh)} anos`
    : 'Sob análise';

  form.hidden = true;
  document.querySelector('.calc-progress').hidden = true;
  results.classList.add('visible');

  if (window.innerWidth < 700) {
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

document.querySelector('.next-step').addEventListener('click', () => {
  if (!fieldsAreValid(['consumption', 'bill'])) return;
  currentStep = 2;
  updateStepUI();
  if (window.innerWidth < 700) document.querySelector('.calculator-app').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('.back-step').addEventListener('click', () => {
  currentStep = 1;
  updateStepUI();
});

document.getElementById('editSimulation').addEventListener('click', () => {
  currentStep = 2;
  updateStepUI();
});

coverage.addEventListener('input', () => {
  coverageLabel.textContent = `${coverage.value}%`;
});

form.addEventListener('submit', calculateSolar);

menuButton.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('#mobileMenu a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  });
});

document.addEventListener('click', event => {
  if (!mobileMenu.classList.contains('open')) return;
  if (!mobileMenu.contains(event.target) && !menuButton.contains(event.target)) {
    mobileMenu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

document.getElementById('contactForm').addEventListener('submit', event => {
  event.preventDefault();
  alert('Formulário demonstrativo. Conecte-o ao WhatsApp, CRM, e-mail ou backend da RobSun para receber os leads.');
});

document.getElementById('year').textContent = new Date().getFullYear();
updateStepUI();
