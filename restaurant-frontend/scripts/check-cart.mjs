import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addItem, canAdd, priceInCents, restoreItems } from '../src/cart/cartModel.js'

const dish = { id: 1, name: 'Pizza', price: 9.90, available: true }
test('adding the same dish increases quantity without duplicate lines', () => {
  const once = addItem([], dish)
  const twice = addItem(once, dish)
  assert.equal(twice.length, 1)
  assert.equal(twice[0].quantity, 2)
  assert.equal(once[0].quantity, 1)
})
test('sold-out dishes and dishes without a usable price cannot be added', () => {
  for (const changed of [{ available: false }, { price: null }, { price: -1 }, { price: 'invalid' }, { price: Infinity }, { id: null }]) {
    const invalid = { ...dish, ...changed }
    assert.equal(canAdd(invalid), false)
    assert.deepEqual(addItem([], invalid), [])
  }
})
test('uses a valid sale price and ignores invalid discounts', () => {
  assert.equal(priceInCents({ ...dish, salePrice: 7.50 }), 750)
  for (const salePrice of [null, 0, -1, 9.9, 15, 'invalid']) assert.equal(priceInCents({ ...dish, salePrice }), 990)
  assert.equal(priceInCents({ ...dish, price: 0.29 }) * 3, 87)
})
test('limits quantities when adding and restoring saved data', () => {
  assert.equal(addItem([{ id: 1, quantity: 99 }], dish)[0].quantity, 99)
  assert.deepEqual(restoreItems([{ id: 1, name: 'Pizza', quantity: 500 }]), [{ id: 1, name: 'Pizza', quantity: 99 }])
})
test('saved data rejects malformed items and combines duplicate ids', () => {
  assert.deepEqual(restoreItems(null), [])
  assert.deepEqual(restoreItems({ id: 1 }), [])
  assert.deepEqual(restoreItems([null, {}, { id: -1, quantity: 1 }, { id: 1, quantity: 0 }, { id: 1, quantity: 1.5 }]), [])
  assert.deepEqual(restoreItems([{ id: 1, name: 'Pizza', quantity: 1 }, { id: 1, quantity: 2 }]), [{ id: 1, name: 'Pizza', quantity: 3 }])
})
