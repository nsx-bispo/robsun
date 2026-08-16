import assert from 'node:assert/strict'
import { calculateSolar } from '../src/solar-model.js'

const base = {
  consumption: 500,
  bill: 550,
  future: 0,
  state: 'SP',
  roofArea: 40,
  orientation: 'N',
  shade: 'none',
  coverage: 100,
  margin: 0,
  panelPower: 585,
  tilt: 23,
  losses: 14,
  connection: 'bi',
  gdRule: 'new2026',
  selfConsumption: 30,
  fioBShare: 28,
  fixedCharges: 0,
}

const standard = calculateSolar(base)
assert.ok(standard.generation >= 500, '100% target must not undersize monthly generation')
assert.ok(standard.panels >= 1)
assert.equal(standard.kw, standard.panels * 0.585)
assert.ok(standard.area > standard.moduleFootprint, 'required roof area must include layout allowance')
assert.ok(standard.coverage >= 100)

const withMargin = calculateSolar({ ...base, margin: 10 })
assert.equal(withMargin.requiredGeneration, 550)
assert.ok(withMargin.panels >= standard.panels, 'design margin must never reduce the array')
assert.ok(withMargin.generation >= 550, '10% margin must cover 110% of projected consumption')

const withGrowth = calculateSolar({ ...base, future: 20 })
assert.equal(withGrowth.projectedConsumption, 600)
assert.ok(withGrowth.generation >= 600, 'future growth must be included before system sizing')

const south = calculateSolar({ ...base, orientation: 'S' })
assert.ok(south.panels > standard.panels, 'south-facing roof must require more capacity than north-facing roof')

const shaded = calculateSolar({ ...base, shade: 'high' })
assert.ok(shaded.panels > standard.panels, 'high shading must increase required capacity')

const legacy = calculateSolar({ ...base, gdRule: 'legacy' })
assert.ok(standard.fioBCharge > 0, '2026 rule must charge the applicable Fio B transition on compensated grid energy')
assert.equal(legacy.fioBCharge, 0)
assert.ok(standard.savings < legacy.savings, 'Fio B transition must reduce estimated savings relative to legacy compensation')

const fixed = calculateSolar({ ...base, fixedCharges: 80 })
assert.ok(fixed.residual >= 80, 'non-compensable fixed charges must remain on the residual bill')
assert.ok(fixed.savings <= standard.savings)

const smallerRoof = calculateSolar({ ...base, roofArea: 5 })
assert.equal(smallerRoof.fits, false)

console.log('solar-model tests passed')
