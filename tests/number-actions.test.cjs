const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/lib/number-actions.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const loaded = new Module(filename, module);
loaded._compile(compiled.outputText, filename);
const { analyzeNumberEntries, analyzeCheckInEntries, locationClipboardText, checkInDateFromInput } = loaded.exports;
const numbers = [{ id: 'one', mobile: '9876543210', currentLocation: 'Mumbai Store' }, { id: 'two', mobile: '9123456789', currentLocation: 'Delhi' }];

test('comma/newline entries are analyzed for validity, duplicates and unavailable numbers', () => {
  const result = analyzeNumberEntries('9876543210, 9123456789\r\n9876543210\n123, abc\n9000000000', numbers);
  assert.equal(analyzeCheckInEntries, analyzeNumberEntries);
  assert.equal(result.filter(entry => entry.number).length, 2);
  assert.match(result[2].issue, /Duplicate/);
  assert.match(result[3].issue, /Invalid/);
  assert.match(result[4].issue, /Invalid/);
  assert.match(result[5].issue, /Not available/);
});

test('duplicate inventory records are rejected rather than updating an arbitrary record', () => {
  const result = analyzeCheckInEntries('9876543210', [...numbers, { ...numbers[0], id: 'duplicate' }]);
  assert.equal(result[0].number, undefined);
  assert.match(result[0].issue, /Multiple inventory/);
});

test('clipboard contains only mobile and location and preserves all rows across pages', () => {
  assert.equal(locationClipboardText(numbers), '9876543210\tMumbai Store\n9123456789\tDelhi');
  assert.equal(locationClipboardText([{ mobile: '9876543210', currentLocation: 'Mumbai\nStore\tOffice' }]), '9876543210\tMumbai Store Office');
});

test('chosen dates are stored at IST midnight and impossible calendar dates are rejected', () => {
  assert.equal(checkInDateFromInput('2026-10-13').toISOString(), '2026-10-12T18:30:00.000Z');
  assert.equal(checkInDateFromInput('2026-02-30'), null);
  assert.equal(checkInDateFromInput(''), null);
  assert.equal(checkInDateFromInput('2026-13-01'), null);
});
