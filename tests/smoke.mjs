import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`✓ ${message}`);

// Compile the browser script without executing it.
try {
  new Function(js);
  pass('JavaScript compiles');
} catch (error) {
  fail(`JavaScript syntax: ${error.message}`);
}

const requiredIds = [
  'solarForm','consumption','bill','state','roofArea','roofType','coverage','coverageLabel',
  'panelPower','losses','lossesLabel','liveSystemKw','livePanels','liveGeneration','liveCoverage',
  'areaUsed','areaAvailable','areaMeter','coverageMeter','panelGrid','houseStage','roofShell',
  'roofWarning','warningPanels','warningCapacity','resultKw','resultPanelCount','resultMonthlyGen',
  'resultAnnualGen','resultArea','resultSavings','resultInvestment','resultPayback','resultFitText',
  'wizardProgress','mobileMenu','contactForm','formSuccess','simulador','year','leadName','leadPhone','leadEmail'
];

for (const id of requiredIds) {
  const matches = html.match(new RegExp(`id=["']${id}["']`, 'g')) ?? [];
  if (matches.length !== 1) fail(`Expected exactly one #${id}; found ${matches.length}`);
}
if (!process.exitCode) pass('Essential DOM IDs are unique and present');

const ids = new Set([...html.matchAll(/id=["']([^"']+)["']/g)].map((m) => m[1]));
const internalLinks = [...html.matchAll(/href=["']#([^"']+)["']/g)].map((m) => m[1]);
const brokenLinks = internalLinks.filter((target) => !ids.has(target));
if (brokenLinks.length) fail(`Broken internal links: ${brokenLinks.join(', ')}`);
else pass('Internal navigation targets exist');

const steps = [...html.matchAll(/class=["'][^"']*wizard-step[^"']*["'][^>]*data-step=["'](\d)["']/g)].map((m) => m[1]);
if (steps.join(',') !== '1,2,3,4') fail(`Wizard steps invalid: ${steps.join(',')}`);
else pass('Calculator has four ordered steps');

for (const reference of ['sunroof.withgoogle.com','pvwatts.nrel.gov','cresesb.cepel.br']) {
  if (!html.includes(reference)) fail(`Missing methodology reference: ${reference}`);
}
if (!process.exitCode) pass('Methodology references are present');

const cssChecks = [
  ['iPhone safe area', 'safe-area-inset-bottom'],
  ['mobile breakpoint', '@media(max-width:640px)'],
  ['reduced motion support', 'prefers-reduced-motion'],
  ['panel animation', '@keyframes panelPop'],
  ['energy animation', '@keyframes energyPulse']
];
for (const [label, token] of cssChecks) {
  if (!css.includes(token)) fail(`Missing CSS feature: ${label}`);
}
if (!process.exitCode) pass('Mobile and animation CSS safeguards are present');

const jsChecks = ['updateVisual()', 'setPanelCount', 'roofWarning', 'shade-high', 'contactForm', 'IntersectionObserver'];
for (const token of jsChecks) {
  if (!js.includes(token)) fail(`Missing interactive behavior marker: ${token}`);
}
if (!process.exitCode) pass('Interactive behavior hooks are present');

if (process.exitCode) process.exit(process.exitCode);
console.log('\nRobSun smoke checks passed.');
