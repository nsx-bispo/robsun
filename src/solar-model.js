// Solar pre-sizing model used by the RobSun calculator.
// References and assumptions:
// - Solar resource methodology: Atlas Brasileiro de Energia Solar (INPE/LABREN, 2017) and CRESESB SunData.
// - System-loss reference: NREL PVWatts (14% default system losses; site-specific effects still require engineering analysis).
// - SCEE / minimum billing / Fio B transition: Lei 14.300/2022 and ANEEL guidance.
// - Installed-price benchmark: Radar Solfacil 1T26 national residential average of R$ 2.45/Wp.

const DAYS_PER_MONTH = 365.25 / 12
const CONNECTION_KWH = { mono: 30, bi: 50, tri: 100 }
const MARKET_REFERENCE_BRL_PER_WP = 2.45

// Extra footprint beyond the module dimensions. Slabs need more room for tilted rows and inter-row spacing.
const LAYOUT_FACTOR_BY_ROOF = { ceramic: 1.06, metal: 1.06, fiber: 1.06, slab: 1.35, other: 1.10 }

// Conservative representative daily solar-hours by UF (kWh/m2.day equivalent HSP).
// These are pre-design references derived from the spatial ranges in the INPE/LABREN atlas and are intentionally
// conservative. They are not a substitute for irradiation at the exact coordinates. The final RobSun proposal must
// use the project location and a detailed solar-resource study.
const HSP_BY_UF = {
  AC: 4.55, AL: 5.35, AP: 4.95, AM: 4.45, BA: 5.45, CE: 5.55, DF: 5.30,
  ES: 5.05, GO: 5.25, MA: 5.25, MT: 5.10, MS: 5.05, MG: 5.25, PA: 4.75,
  PB: 5.55, PR: 4.65, PE: 5.45, PI: 5.55, RJ: 4.95, RN: 5.65, RS: 4.60,
  RO: 4.65, RR: 4.95, SC: 4.35, SP: 4.80, SE: 5.35, TO: 5.30,
}

// Approximate absolute latitude of each UF's representative load centre, used only to derive a reference tilt.
const LAT_BY_UF = {
  AC: 9, AL: 10, AP: 1, AM: 4, BA: 12, CE: 5, DF: 16, ES: 20, GO: 16,
  MA: 5, MT: 13, MS: 21, MG: 19, PA: 4, PB: 7, PR: 25, PE: 8, PI: 7,
  RJ: 23, RN: 6, RS: 29, RO: 11, RR: 2, SC: 27, SP: 23, SE: 11, TO: 10,
}

const ORIENTATION_FACTOR = { N: 1, NE: 0.96, E: 0.90, S: 0.78 }
const SHADE_FACTOR = { none: 1, light: 0.95, medium: 0.86, high: 0.72 }
const PANEL_AREA = { 550: 2.55, 585: 2.58, 610: 2.62, 700: 3.10 }

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function referenceTilt(state) {
  // CRESESB uses latitude as a common reference and recommends avoiding tilt below 10 degrees.
  return Math.max(10, Math.round(LAT_BY_UF[state] || 20))
}

function tiltFactor(state, tilt) {
  const delta = Math.abs(Number(tilt) - referenceTilt(state))
  // Simplified annual derate for a pre-analysis. Capped at 8%; exact transposition is done in the executive study.
  return Math.max(0.92, 1 - Math.min(0.08, delta * 0.0015))
}

function marketRange(kw) {
  // Smaller residential systems tend to have a higher R$/Wp; larger systems dilute fixed integration costs.
  const sizeFactor = kw <= 3 ? 1.10 : kw >= 8 ? 0.94 : 1
  const center = MARKET_REFERENCE_BRL_PER_WP * sizeFactor
  return { low: center * 0.86, high: center * 1.20 }
}

export function calculateSolar(values) {
  const consumption = Math.max(50, Number(values.consumption) || 500)
  const bill = Math.max(0, Number(values.bill) || 0)
  const futureGrowth = clamp(Number(values.future) || 0, 0, 100) / 100
  const projectedConsumption = consumption * (1 + futureGrowth)

  const coverageBase = clamp(Number(values.coverage) || 100, 50, 100) / 100
  const designMargin = clamp(Number(values.margin) || 0, 0, 20) / 100
  const target = coverageBase * (1 + designMargin)
  const requiredGeneration = projectedConsumption * target

  const state = values.state || 'SP'
  const sun = HSP_BY_UF[state] || HSP_BY_UF.SP
  const orientation = ORIENTATION_FACTOR[values.orientation] ?? 1
  const shading = SHADE_FACTOR[values.shade] ?? 1
  const inclination = tiltFactor(state, Number(values.tilt) || referenceTilt(state))
  const losses = clamp(Number(values.losses) || 14, 0, 35) / 100
  const netYieldPerKwp = sun * DAYS_PER_MONTH * orientation * shading * inclination * (1 - losses)

  const rawKw = requiredGeneration / Math.max(1, netYieldPerKwp)
  const panelPower = Math.max(300, Number(values.panelPower) || 585)
  const panels = Math.max(1, Math.ceil((rawKw * 1000) / panelPower))
  const kw = (panels * panelPower) / 1000
  const generation = kw * netYieldPerKwp

  const moduleFootprint = panels * (PANEL_AREA[panelPower] || 2.6)
  const layoutFactor = LAYOUT_FACTOR_BY_ROOF[values.roofType] || LAYOUT_FACTOR_BY_ROOF.other
  const area = moduleFootprint * layoutFactor
  const roofArea = Math.max(1, Number(values.roofArea) || 40)
  const fits = area <= roofArea
  const actualCoverage = (generation / projectedConsumption) * 100

  // Financial model. Users can separate charges that will not be offset (e.g. public-lighting contribution/services).
  const fixedCharges = clamp(Number(values.fixedCharges) || 0, 0, bill)
  const currentEnergyBill = Math.max(0, bill - fixedCharges)
  const tariff = currentEnergyBill / consumption
  const projectedBill = fixedCharges + tariff * projectedConsumption

  // Instant self-consumption never enters the SCEE. Only exported energy later used to offset grid imports is compensated.
  const selfConsumptionRatio = clamp(Number(values.selfConsumption) || 30, 0, 100) / 100
  const selfConsumed = Math.min(projectedConsumption, generation * selfConsumptionRatio)
  const gridImportBeforeCredits = Math.max(0, projectedConsumption - selfConsumed)
  const exported = Math.max(0, generation - selfConsumed)
  const compensated = Math.min(gridImportBeforeCredits, exported)
  const bankedCredits = Math.max(0, exported - compensated)
  const offsetEnergy = Math.min(projectedConsumption, selfConsumed + compensated)

  // Art. 27 of Lei 14.300 applies 60% in 2026 to the listed distribution components, not to the full retail tariff.
  // fioBShare is therefore an explicit approximation of those components as a share of the user's effective tariff.
  const fioBShare = clamp(Number(values.fioBShare) || 28, 0, 100) / 100
  const fioBTransition = values.gdRule === 'new2026' ? 0.60 : 0
  const fioBCharge = compensated * tariff * fioBShare * fioBTransition
  const availabilityEnergy = tariff * (CONNECTION_KWH[values.connection] || 50)
  const remainingEnergyCharge = Math.max(0, (projectedConsumption - offsetEnergy) * tariff)
  const energyResidual = Math.max(availabilityEnergy, remainingEnergyCharge + fioBCharge)
  const residual = fixedCharges + energyResidual
  const savings = Math.max(0, projectedBill - residual)
  const annualSavings = savings * 12

  const price = marketRange(kw)
  const investmentLow = kw * 1000 * price.low
  const investmentHigh = kw * 1000 * price.high

  return {
    sun,
    referenceTilt: referenceTilt(state),
    panels,
    kw,
    generation,
    requiredGeneration,
    projectedConsumption,
    area,
    moduleFootprint,
    layoutFactor,
    roofArea,
    fits,
    coverage: actualCoverage,
    target,
    coverageBase,
    designMargin,
    tariff,
    projectedBill,
    selfConsumed,
    compensated,
    bankedCredits,
    fioBCharge,
    availabilityEnergy,
    fixedCharges,
    savings,
    residual,
    investmentLow,
    investmentHigh,
    payLow: annualSavings ? investmentLow / annualSavings : 0,
    payHigh: annualSavings ? investmentHigh / annualSavings : 0,
  }
}

export const SOLAR_MODEL_REFERENCES = {
  atlas: 'https://labren.ccst.inpe.br/atlas_2017.html',
  sundata: 'https://www.cresesb.cepel.br/index.php?section=sundata',
  pvwatts: 'https://pvwatts.nrel.gov/',
  aneel: 'https://www.gov.br/aneel/pt-br/assuntos/geracao-distribuida',
  law14300: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14300.htm',
  market: 'https://lp.solfacil.com.br/radar-solfacil',
}
