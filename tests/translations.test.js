import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultLanguage, TRANSLATIONS, translate } from '../translations.js';

test('getDefaultLanguage selects Norwegian only for Norwegian browser locales', () => {
  assert.equal(getDefaultLanguage('nb-NO'), 'no');
  assert.equal(getDefaultLanguage('no-NO'), 'no');
  assert.equal(getDefaultLanguage('en-GB'), 'en');
});

test('translate returns localized text and replaces template values', () => {
  assert.equal(translate('no', 'lostLife', { lives: 2 }), 'Du mistet et liv. 2 liv igjen.');
  assert.equal(translate('en', 'lostLife', { lives: 2 }), 'You lost a life. 2 lives remaining.');
});

test('translate falls back safely for unknown languages and keys', () => {
  assert.equal(translate('de', 'menu'), 'Meny');
  assert.equal(translate('en', 'missingKey'), 'missingKey');
});

test('Norwegian and English dictionaries contain the same translation keys', () => {
  assert.deepEqual(
    Object.keys(TRANSLATIONS.en).sort(),
    Object.keys(TRANSLATIONS.no).sort()
  );
});
