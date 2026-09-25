import { describe, expect, it } from 'vitest'
import { computePaymentAmount, computeVisibility, validateAnswers, validateField } from './logic'

const schema = {
  pages: [
    { key: 'p1', fields: [
      { key: 'type', field_type: 'radio', label: 'Type', required: true, config: { options: [{ label: 'Solo', value: 'solo' }, { label: 'Group', value: 'group_booking' }] } },
      { key: 'size', field_type: 'number', label: 'Group Size', required: true, config: { conditional_logic: { action: 'show', match: 'all', conditions: [{ field: 'type', operator: 'equals', value: 'group_booking' }] } } },
      { key: 'discount', field_type: 'text', label: 'Discount', config: { conditional_logic: { action: 'show', match: 'all', conditions: [{ field: 'type', operator: 'equals', value: 'group_booking' }, { field: 'size', operator: 'gt', value: '10' }] } } },
    ] },
    { key: 'p2', logic: { action: 'hide', match: 'all', conditions: [{ field: 'type', operator: 'equals', value: 'solo' }] }, fields: [
      { key: 'leader', field_type: 'text', label: 'Leader', required: true, config: {} },
    ] },
  ],
}

describe('conditional logic', () => {
  it('shows group fields only for group bookings', () => {
    expect(computeVisibility(schema, { type: 'solo' }).fields.has('size')).toBe(false)
    expect(computeVisibility(schema, { type: 'group_booking', size: 12 }).fields.has('discount')).toBe(true)
    expect(computeVisibility(schema, { type: 'group_booking', size: 5 }).fields.has('discount')).toBe(false)
  })
  it('cascades hidden answers', () => {
    expect(computeVisibility(schema, { type: 'solo', size: 50 }).fields.has('discount')).toBe(false)
  })
  it('hides pages', () => {
    expect([...computeVisibility(schema, { type: 'solo' }).pages]).toEqual(['p1'])
  })
  it('does not validate hidden fields', () => {
    expect(validateAnswers(schema, { type: 'solo' })).toEqual({})
    expect(Object.keys(validateAnswers(schema, { type: 'group_booking' }))).toEqual(['size', 'leader'])
  })
})

describe('validation', () => {
  it('validates emails, patterns and ranges', () => {
    expect(validateField({ field_type: 'email', label: 'E' }, 'x@')).toBeTruthy()
    expect(validateField({ field_type: 'email', label: 'E' }, 'x@y.com')).toBeNull()
    const passport = { field_type: 'text', label: 'P', config: { validation: { pattern: '[A-Z][0-9]{7}' } } }
    expect(validateField(passport, 'A1234567')).toBeNull()
    expect(validateField(passport, 'A12345678')).toBeTruthy()
    expect(validateField({ field_type: 'number', label: 'N', config: { validation: { min: 1, max: 3 } } }, 5)).toBeTruthy()
  })
})

describe('payments', () => {
  it('computes dynamic amounts', () => {
    const field = { config: { amount: 1000, per_unit_field: 'n', per_unit_amount: 500, option_prices: { addons: { spa: 200 } }, deposit_percent: 50 } }
    expect(computePaymentAmount(field, { n: 2, addons: ['spa'] })).toBe(1100)
  })
})
