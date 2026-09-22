import test from 'node:test';
import assert from 'node:assert';

// Mocking session storage
const store = new Map();
global.sessionStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, val) => store.set(key, val),
  clear: () => store.clear()
};

const { services, getServiceIntent, saveServiceIntent } = await import('../src/data/services.ts');

test('Services catalog is defined and valid', (t) => {
  assert.ok(services.length > 0, 'Catalog should not be empty');
  
  const ids = services.map(s => s.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(ids.length, uniqueIds.size, 'Service IDs should be unique');
  
  for (const s of services) {
    assert.ok(s.titleAr && s.titleEn, 'Services must have titles');
    assert.ok(['standard', 'assessment'].includes(s.category), 'Category must be standard or assessment');
  }
});

test('Session intent can be saved and retrieved', (t) => {
  sessionStorage.clear();
  
  assert.deepStrictEqual(getServiceIntent(), [], 'Initial intent is empty');
  
  saveServiceIntent(['maintenance', 'trim']);
  
  const saved = getServiceIntent();
  assert.deepStrictEqual(saved, ['maintenance', 'trim'], 'Saved intent should match');
});

test('Session intent validation ignores invalid types', (t) => {
  sessionStorage.clear();
  sessionStorage.setItem('wareef_intent', '{"invalid":"json"}');
  assert.deepStrictEqual(getServiceIntent(), [], 'Invalid shape returns empty array');

  sessionStorage.setItem('wareef_intent', JSON.stringify(['maintenance', 123]));
  assert.deepStrictEqual(getServiceIntent(), [], 'Array with non-strings returns empty array');
});

test('Filter simulation (manual)', (t) => {
  // basic category test
  const standard = services.filter(s => s.category === 'standard');
  const assessment = services.filter(s => s.category === 'assessment');
  assert.ok(standard.length > 0, 'Should have standard services');
  assert.ok(assessment.length > 0, 'Should have assessment services');
});
