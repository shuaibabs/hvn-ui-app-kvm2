const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { Timestamp } = require('firebase/firestore');
let records, role, database, commits, toasts;
let stateIndex = 0;
let docIndex = 0;
const react = {
  createContext: () => ({ Provider: 'provider' }),
  createElement: (type, props) => ({ type, props }),
  useCallback: fn => fn, useMemo: fn => fn(), useEffect() {},
  useState: value => [stateIndex++ === 0 ? records : value === true ? false : value, () => {}]
};
const firestore = {
  Timestamp, collection: (db, name) => ({ name }),
  doc: (dbOrCollection, name, id) => id ? { name, id } : { name: dbOrCollection.name, id: `activity-${++docIndex}` },
  serverTimestamp: () => 'server-timestamp', arrayUnion: value => ({ union: value }),
  async runTransaction(db, run) {
    const changes = [];
    const result = await run({
      async get(ref) { return { id: ref.id, ref, exists: () => database.has(ref.id), data: () => database.get(ref.id) }; },
      update(ref, data) { changes.push({ ref, data, update: true }); },
      set(ref, data) { changes.push({ ref, data, update: false }); }
    });
    for (const change of changes) if (change.update) Object.assign(database.get(change.ref.id), change.data);
    commits.push(changes);
    return result;
  }
};
const sourcePath = path.resolve(__dirname, '../src/context/app-context.tsx');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true }
});
const datePath = path.resolve(__dirname, '../src/lib/system-reminders.ts');
const dates = new Module(datePath, module);
dates._compile(ts.transpileModule(fs.readFileSync(datePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, datePath);
const loaded = new Module(sourcePath, module);
loaded.require = name => {
  if (name === 'react') return react;
  if (name === 'firebase/firestore') return firestore;
  if (name === '@/context/auth-context') return { useAuth: () => ({ user: { uid: 'employee', displayName: 'Employee' }, role, profile: { displayName: 'Employee' }, loading: false }) };
  if (name === '@/firebase') return { useFirestore: () => ({}) };
  if (name === '@/hooks/use-toast') return { useToast: () => ({ toast: value => toasts.push(value) }) };
  if (name === '@/lib/system-reminders') return dates.exports;
  if (name.startsWith('@/')) return {};
  return require(name);
};
loaded._compile(compiled.outputText, sourcePath);
function reset(recordCount = 2, userRole = 'employee') {
  role = userRole; stateIndex = 0; docIndex = 0; commits = []; toasts = [];
  records = Array.from({ length: recordCount }, (_, index) => ({
    id: `number-${index}`, mobile: `${9000000000 + index}`, assignedTo: 'Employee',
    ownershipType: 'Partnership', partnerName: 'Old Partner', currentLocation: 'Store', checkInDate: null,
    status: 'Non-RTP', rtpDate: Timestamp.fromDate(new Date('2099-01-01T18:30:00Z')), uploadStatus: 'Pending'
  }));
  database = new Map(records.map(record => [record.id, { ...record }]));
  return loaded.exports.AppProvider({ children: null }).props.value;
}

test('employee bulk ownership clears partner names and commits activities with number changes', async () => {
  const app = reset();
  await app.bulkUpdateOwnership(records.map(record => record.id), 'Individual', 'ignored');
  assert.equal(commits.length, 1);
  assert.equal(commits[0].filter(write => write.update).length, 2);
  for (const record of database.values()) {
    assert.equal(record.ownershipType, 'Individual'); assert.equal(record.partnerName, ''); assert.ok(record.history.union);
  }
  const activity = commits[0].find(write => !write.update).data;
  assert.equal(activity.notificationStatus, 'Pending');
  assert.match(activity.description, /9000000000/); assert.match(activity.description, /9000000001/);
});

test('admin bulk changes support multiple safe chunks with an activity in each transaction', async () => {
  const app = reset(85, 'admin');
  await app.bulkUpdateOwnership(records.map(record => record.id), 'Partnership', 'New Partner');
  assert.deepEqual(commits.map(chunk => chunk.length), [41, 41, 6]);
  for (const record of database.values()) assert.equal(record.partnerName, 'New Partner');
});

test('missing partner names and stale ownership previews are rejected before writing', async () => {
  const app = reset();
  await assert.rejects(app.bulkUpdateOwnership(['number-0'], 'Partnership', ''), /partner name/);
  database.get('number-0').partnerName = 'Changed Elsewhere';
  await assert.rejects(app.bulkUpdateOwnership(['number-0'], 'Individual', ''), /changed/);
  assert.equal(commits.length, 0);
});

test('employees cannot mutate records reassigned to another employee', async () => {
  const app = reset();
  database.get('number-0').assignedTo = 'Other Employee';
  await assert.rejects(app.bulkUpdateCheckInDate(['number-0'], new Date('2026-10-12T18:30:00Z')), /no longer assigned/);
  assert.equal(commits.length, 0);
});

test('bulk date replacement preserves other fields and logs previous/new dates', async () => {
  const app = reset();
  const date = new Date('2026-10-12T18:30:00Z');
  await app.bulkUpdateCheckInDate(['number-0', 'number-1'], date);
  assert.equal(database.get('number-0').checkInDate.toDate().toISOString(), date.toISOString());
  assert.equal(database.get('number-0').partnerName, 'Old Partner');
  assert.match(commits[0].find(write => !write.update).data.description, /not set → 2026-10-13/);
});

test('concurrent date edits and removed inventory records fail atomically within each chunk', async () => {
  const app = reset();
  database.get('number-1').checkInDate = Timestamp.fromDate(new Date('2026-09-01'));
  await assert.rejects(app.bulkUpdateCheckInDate(['number-0', 'number-1'], new Date('2026-10-13')), /changed/);
  assert.equal(database.get('number-0').checkInDate, null);
  assert.equal(commits.length, 0);
  database.delete('number-1');
  await assert.rejects(app.bulkUpdateCheckInDate(['number-1'], new Date('2026-10-13')), /no longer available/);
});

test('employee bulk RTP changes clear dates and atomically queue activity with before/after details', async () => {
  const app = reset();
  await app.bulkUpdateNumberStatus(['number-0', 'number-1', 'number-0'], 'RTP', null);
  assert.equal(commits.length, 1);
  assert.equal(commits[0].filter(write => write.update).length, 2);
  for (const record of database.values()) {
    assert.equal(record.status, 'RTP'); assert.equal(record.rtpDate, null);
    assert.equal(record.uploadStatus, 'Pending'); assert.equal(record.partnerName, 'Old Partner');
    assert.equal(record.history.union.action, 'Bulk Updated RTP Status');
  }
  const activity = commits[0].find(write => !write.update).data;
  assert.equal(activity.action, 'Bulk Updated RTP Status');
  assert.equal(activity.notificationStatus, 'Pending'); assert.equal(activity.groupName, 'INVENTORY');
  assert.match(activity.description, /9000000000: Non-RTP/);
  assert.match(activity.description, /→ RTP/); assert.match(activity.description, /9000000001/);
});

test('admin bulk Non-RTP changes store the chosen future schedule and log every chunk', async () => {
  const app = reset(85, 'admin');
  const date = new Date('2099-02-01T18:30:00Z');
  await app.bulkUpdateNumberStatus(records.map(record => record.id), 'Non-RTP', date);
  assert.deepEqual(commits.map(chunk => chunk.length), [41, 41, 6]);
  for (const record of database.values()) {
    assert.equal(record.status, 'Non-RTP'); assert.equal(record.rtpDate.toMillis(), date.getTime());
  }
  assert.match(commits[0].find(write => !write.update).data.description, /2099-02-02/);
});

test('invalid status and missing, invalid, past, or today Non-RTP dates are rejected before writing', async () => {
  const app = reset();
  await assert.rejects(app.bulkUpdateNumberStatus(['number-0'], 'Other', null), /Choose RTP/);
  for (const date of [null, new Date('invalid'), new Date('2020-01-01'), new Date()]) {
    await assert.rejects(app.bulkUpdateNumberStatus(['number-0'], 'Non-RTP', date), /future RTP date/);
  }
  assert.equal(commits.length, 0);
});

test('concurrent RTP status or schedule edits reject a whole chunk without overwriting changes', async () => {
  for (const change of [{ status: 'RTP' }, { rtpDate: Timestamp.fromDate(new Date('2098-01-01')) }]) {
    const app = reset();
    Object.assign(database.get('number-1'), change);
    await assert.rejects(app.bulkUpdateNumberStatus(['number-0', 'number-1'], 'RTP', null), /changed/);
    assert.equal(database.get('number-0').status, 'Non-RTP'); assert.equal(commits.length, 0);
  }
});

test('unchanged RTP schedules skip writes and unsupported roles or reassigned records cannot update', async () => {
  let app = reset();
  await app.bulkUpdateNumberStatus(['number-0'], 'Non-RTP', records[0].rtpDate.toDate());
  assert.equal(commits.flat().length, 0);
  app = reset();
  database.get('number-0').assignedTo = 'Other Employee';
  await assert.rejects(app.bulkUpdateNumberStatus(['number-0'], 'RTP', null), /no longer assigned/);
  assert.equal(commits.length, 0);
  app = reset(2, 'viewer');
  await assert.rejects(app.bulkUpdateNumberStatus(['number-0'], 'RTP', null), /admin or employee/);
  assert.equal(commits.length, 0);
});
