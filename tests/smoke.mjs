import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('v4.css', 'utf8');
const js = fs.readFileSync('v4.js', 'utf8');
const logo = fs.readFileSync('assets/logo-robsun.svg', 'utf8');

const failures = [];
const fail = message => failures.push(message);
const pass = message => console.log(`✓ ${message}`);

try { new Function(js); pass('v4.js compiles'); } catch (error) { fail(`JavaScript syntax: ${error.message}`); }

const requiredIds = [
  'solarForm','consumption','bill','state','roofArea','roofType','coverage','coverageLabel','panelPower','losses','lossesLabel',
  'wizardProgress','panelGrid','roofStage','roofShell','panelOverflow','compassArrow','orientationText','shadeText','solarResourceText',
  'roofWarning','warningRequiredArea','warningAvailableArea','liveSystemKw','livePanels','liveGeneration','liveCoverage','areaUsed','areaAvailable','areaMeter',
  'resultKw','resultCoverageText','resultPanelCount','resultPanelPower','resultMonthlyGen','resultAnnualGen','resultArea','resultSavings','resultInvestment','resultPayback','resultFitText',
  'mobileMenu','contactForm','formSuccess','leadName','leadPhone','leadEmail','leadProjectSummary','simulador','resultado','solucoes','como-funciona','diferenciais','year','typewriter'
];
for (const id of requiredIds) {
  const count = (html.match(new RegExp(`id=["']${id}["']`, 'g')) || []).length;
  if (count !== 1) fail(`Expected one #${id}; found ${count}`);
}
if (!failures.length) pass('Essential DOM IDs are present and unique');

const ids = new Set([...html.matchAll(/id=["']([^"']+)["']/g)].map(match => match[1]));
const internalTargets = [...html.matchAll(/href=["']#([^"']+)["']/g)].map(match => match[1]);
const broken = internalTargets.filter(target => !ids.has(target));
if (broken.length) fail(`Broken internal links: ${broken.join(', ')}`); else pass('Internal navigation targets exist');

const steps = [...html.matchAll(/class=["'][^"']*wizard-step[^"']*["'][^>]*data-step=["'](\d)["']/g)].map(match => match[1]);
if (steps.join(',') !== '1,2,3,4') fail(`Wizard steps invalid: ${steps.join(',')}`); else pass('Four calculator steps are present');

for (const reference of ['cresesb.cepel.br','pvwatts.nrel.gov','lp.solfacil.com.br']) {
  if (!html.includes(reference)) fail(`Missing methodology reference: ${reference}`);
}
if (!failures.length) pass('Methodology references are present');

for (const token of ['safe-area-inset-bottom','prefers-reduced-motion','@keyframes panelEnter','@keyframes energyTravel','@keyframes sunFloat']) {
  if (!css.includes(token)) fail(`Missing CSS safeguard/animation: ${token}`);
}

for (const token of ['updateVisual()', 'setPanelCount', 'animateNumber', 'startTypewriter', 'IntersectionObserver', 'MARKET_REFERENCE_BRL_PER_WP']) {
  if (!js.includes(token)) fail(`Missing interactive behavior marker: ${token}`);
}

if (html.includes('Projeto solar em tempo real')) fail('Removed hero block text is still present');
if (html.includes('sistema ideal')) fail('Overclaim "sistema ideal" is still present');
if (html.includes('100% navegável')) fail('Internal/demo UX wording leaked into customer copy');
if (!html.includes('Quero meu projeto solar')) fail('Primary sales CTA is missing');
if (!html.includes('Projeto e instalação completos')) fail('Full-service solar offer is missing');
if (logo.includes('<rect')) fail('Logo must have transparent background');
if (!js.includes('ROOF_ROTATION')) fail('Roof orientation animation is missing');
if (!js.includes('leadProjectSummary')) fail('Calculator-to-lead summary bridge is missing');

if (failures.length) {
  failures.forEach(message => console.error(`✗ ${message}`));
  process.exit(1);
}
console.log('\nRobSun v4 smoke checks passed.');
