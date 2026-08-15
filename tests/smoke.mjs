import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('v5.min.css', 'utf8');
const js = fs.readFileSync('v5.js', 'utf8');
const logo = fs.readFileSync('assets/logo-robsun.svg', 'utf8');
const failures = [];
const fail = message => failures.push(message);
const pass = message => console.log(`✓ ${message}`);

try { new Function(js); pass('v5.js compiles'); } catch (error) { fail(`JavaScript syntax: ${error.message}`); }

const requiredIds = ['top','typewriter','simulador','solarForm','wizardProgress','consumption','bill','state','roofArea','coverage','coverageLabel','panelPower','losses','lossesLabel','futureLoadGroup','orientationGroup','shadeGroup','roofStage','roofShell','panelGrid','panelOverflow','compassArrow','orientationText','shadeText','solarResourceText','roofWarning','warningRequiredArea','warningAvailableArea','liveSystemKw','livePanels','liveGeneration','liveCoverage','areaUsed','areaAvailable','areaMeter','resultKw','resultCoverageText','resultPanelCount','resultPanelPower','resultMonthlyGen','resultAnnualGen','resultArea','resultSavings','resultInvestment','resultPayback','resultFitText','solucoes','processo','diferenciais','faq','contato','leadProjectSummary','contactForm','formSuccess','mobileMenu','year'];
for (const id of requiredIds) {
  const count = (html.match(new RegExp(`id=["']${id}["']`, 'g')) || []).length;
  if (count !== 1) fail(`Expected one #${id}; found ${count}`);
}
if (!failures.length) pass('Essential DOM IDs are unique and present');

const ids = new Set([...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]));
const brokenLinks = [...html.matchAll(/href=["']#([^"']+)["']/g)].map(m => m[1]).filter(target => !ids.has(target));
if (brokenLinks.length) fail(`Broken internal links: ${brokenLinks.join(', ')}`); else pass('Internal navigation targets exist');

const steps = [...html.matchAll(/class=["'][^"']*wizard-step[^"']*["'][^>]*data-step=["'](\d)["']/g)].map(m => m[1]);
if (steps.join(',') !== '1,2,3,4') fail(`Wizard steps invalid: ${steps.join(',')}`); else pass('Calculator has four ordered steps');

const simulatorIndex = html.indexOf('id="simulador"');
const solutionsIndex = html.indexOf('id="solucoes"');
if (simulatorIndex < 0 || solutionsIndex < 0 || simulatorIndex > solutionsIndex) fail('Calculator must appear before long commercial sections on mobile');
else pass('Calculator appears early in the page flow');

for (const token of ['typewriter()','setTimeout(tick,1200)','phrases=[','DOMContentLoaded']) {
  if (!js.includes(token)) fail(`Typewriter runtime marker missing: ${token}`);
}
if (!failures.length) pass('Typewriter runtime is wired');

for (const token of ['@media(max-width:699px)','safe-area-inset-bottom','.simulator-grid{display:flex;flex-direction:column}','prefers-reduced-motion','@keyframes panelIn']) {
  if (!css.includes(token)) fail(`Mobile/animation CSS marker missing: ${token}`);
}
if (!failures.length) pass('Mobile calculator layout and animation safeguards are present');

if (html.includes('Projeto solar em tempo real')) fail('Removed hero preview block returned');
if (!html.includes('Quero meu projeto solar')) fail('Primary project-sales CTA missing');
if (!html.includes('Calculadora solar')) fail('Calculator navigation label missing');
if (logo.includes('<rect')) fail('Logo background must stay transparent');

if (failures.length) {
  failures.forEach(message => console.error(`✗ ${message}`));
  process.exit(1);
}
console.log('\nRobSun v5 smoke checks passed.');
