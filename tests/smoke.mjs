import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('v3.css', 'utf8');
const js = fs.readFileSync('v3.js', 'utf8');

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`✓ ${message}`);

try {
  new Function(js);
  pass('RobSun v3 JavaScript compiles');
} catch (error) {
  fail(`JavaScript syntax: ${error.message}`);
}

const requiredIds = [
  'solarForm','consumption','bill','state','roofArea','roofType','coverage','coverageLabel',
  'panelPower','losses','lossesLabel','liveSystemKw','livePanels','liveGeneration','liveCoverage',
  'areaUsed','areaAvailable','areaMeter','coverageMeter','coverageMeterText','panelGrid','houseStage','roofShell',
  'roofWarning','warningPanels','warningCapacity','resultKw','resultPanelCount','resultMonthlyGen',
  'resultAnnualGen','resultArea','resultSavings','resultInvestment','resultPayback','resultFitText','resultNote',
  'wizardProgress','mobileMenu','contactForm','formSuccess','simulador','year','typewriter','heroRoofGrid'
];

for (const id of requiredIds) {
  const matches = html.match(new RegExp(`id=["']${id}["']`, 'g')) ?? [];
  if (matches.length !== 1) fail(`Expected exactly one #${id}; found ${matches.length}`);
}
if (!process.exitCode) pass('Essential v3 DOM IDs are unique and present');

const ids = new Set([...html.matchAll(/id=["']([^"']+)["']/g)].map((m) => m[1]));
const internalLinks = [...html.matchAll(/href=["']#([^"']+)["']/g)].map((m) => m[1]);
const brokenLinks = internalLinks.filter((target) => !ids.has(target));
if (brokenLinks.length) fail(`Broken internal links: ${brokenLinks.join(', ')}`);
else pass('Internal navigation targets exist');

const steps = [...html.matchAll(/class=["'][^"']*wizard-step[^"']*["'][^>]*data-step=["'](\d)["']/g)].map((m) => m[1]);
if (steps.join(',') !== '1,2,3,4') fail(`Wizard steps invalid: ${steps.join(',')}`);
else pass('Calculator has four ordered steps');

if (!html.includes('assets/logo-robsun.svg')) fail('RobSun brand asset is missing');
else pass('RobSun brand identity asset is referenced');

const cssChecks = [
  ['iPhone safe area', 'safe-area-inset-bottom'],
  ['reduced motion support', 'prefers-reduced-motion'],
  ['panel entrance animation', '@keyframes panelIn'],
  ['live status animation', '@keyframes pulse'],
  ['premium roof visualization', '.roof-platform'],
  ['typewriter presentation', '.typewrap']
];
for (const [label, token] of cssChecks) {
  if (!css.includes(token)) fail(`Missing CSS feature: ${label}`);
}
if (!process.exitCode) pass('Mobile, branding and animation CSS safeguards are present');

const jsChecks = ['startTypewriter', 'phrases', 'updateVisual()', 'setPanelCount', 'roofWarning', 'shade-high', 'contactForm', 'IntersectionObserver'];
for (const token of jsChecks) {
  if (!js.includes(token)) fail(`Missing interactive behavior marker: ${token}`);
}
if (!process.exitCode) pass('Interactive v3 behavior hooks are present');

if (process.exitCode) process.exit(process.exitCode);
console.log('\nRobSun v3 smoke checks passed.');
