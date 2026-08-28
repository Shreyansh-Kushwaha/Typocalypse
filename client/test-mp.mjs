// Throwaway end-to-end smoke test for the multiplayer server.
import { io } from 'socket.io-client';
import { createRequire } from 'module';
const require = createRequire('/workspaces/codespaces-blank/typo/Typocalypse/server/index.js');
const jwt = require('jsonwebtoken');

const URL = 'http://localhost:3100';
const SECRET = process.env.JWT_SECRET || 'your-secret-key';
const tok = (id, name) => jwt.sign({ userId: id, username: name }, SECRET);

const log = (...a) => console.log(...a);
const fail = (msg) => { console.error('FAIL:', msg); process.exit(1); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

function connect(id, name) {
  return new Promise((resolve, reject) => {
    const s = io(URL, { auth: { token: tok(id, name) }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

function once(sock, event, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeout);
    sock.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

const emit = (sock, ev, data) => new Promise(r => data === undefined ? sock.emit(ev, r) : sock.emit(ev, data, r));

// ---- Test 1: Story Sprint with 2 players ----
async function testSprint() {
  const a = await connect('userA', 'alice');
  const b = await connect('userB', 'bob');
  const created = await emit(a, 'room:create', { mode: 'sprint', settings: { genre: 'horror' } });
  if (!created.ok) fail('create room');
  const code = created.room.code;
  log('room created', code);
  const joined = await emit(b, 'room:join', { code });
  if (!joined.ok) fail('join room');
  b.emit('room:ready', { ready: true });
  await wait(200);
  const legP = once(a, 'sprint:leg');
  const started = await emit(a, 'room:start', undefined);
  if (!started.ok) fail('start: ' + started.error);
  const leg = await legP;
  log('leg 1 text len', leg.text.length);
  await wait(leg.startAt - Date.now() + 200);
  // alice types the whole passage, bob does half
  a.emit('game:event', { type: 'progress', data: { chars: leg.text.length, errors: 2, done: true } });
  b.emit('game:event', { type: 'progress', data: { chars: Math.floor(leg.text.length / 2), errors: 5 } });
  const choosingP = once(a, 'sprint:choosing');
  const chosenP = once(b, 'sprint:chosen');
  const leg2P = once(b, 'sprint:leg');
  const legend = await once(b, 'sprint:legend');
  if (legend.winner.name !== 'alice') fail('alice should win leg');
  log('leg winner', legend.winner.name);
  const choosing = await choosingP;
  a.emit('game:event', { type: 'choice', data: { choice: choosing.choices[0] } });
  const chosen = await chosenP;
  log('choice landed', chosen.choice);
  const leg2 = await leg2P;
  if (leg2.leg !== 2) fail('expected leg 2');
  log('sprint OK');
  await emit(a, 'room:leave', undefined);
  await emit(b, 'room:leave', undefined);
  a.close(); b.close();
}

// ---- Test 2: Horde Night solo ----
async function testHorde() {
  const a = await connect('userC', 'carol');
  const created = await emit(a, 'room:create', { mode: 'horde', settings: { genre: 'fantasy' } });
  const startedP = once(a, 'horde:start');
  const st = await emit(a, 'room:start', undefined);
  if (!st.ok) fail('horde start: ' + st.error);
  await startedP;
  const waveData = await once(a, 'horde:wave');
  log('wave', waveData.wave, 'spawns', waveData.spawns);
  const field = await once(a, 'horde:field');
  if (!field.zombies.length) fail('no zombies spawned');
  const z = field.zombies[0];
  a.emit('game:event', { type: 'claim', data: { id: z.id } });
  a.emit('game:event', { type: 'typo', data: { id: z.id } });
  a.emit('game:event', { type: 'kill', data: { id: z.id, word: z.word } });
  const kill = await once(a, 'horde:kill');
  if (kill.by !== 'carol') fail('kill credit');
  log('killed zombie, points', kill.points);
  log('horde OK');
  await emit(a, 'room:leave', undefined);
  a.close();
}

// ---- Test 3: Tug of Words 2 players ----
async function testTug() {
  const a = await connect('userD', 'dan');
  const b = await connect('userE', 'eve');
  const created = await emit(a, 'room:create', { mode: 'tug', settings: {} });
  await emit(b, 'room:join', { code: created.room.code });
  b.emit('room:ready', { ready: true });
  await wait(200);
  const teamsP = once(a, 'tug:teams');
  const wordsP = once(a, 'tug:words');
  const st = await emit(a, 'room:start', undefined);
  if (!st.ok) fail('tug start: ' + st.error);
  const teams = await teamsP;
  const words = await wordsP;
  log('teams', teams.teal.map(p => p.name), 'vs', teams.crimson.map(p => p.name));
  await once(a, 'tug:pull');
  for (let i = 0; i < 10; i++) a.emit('game:event', { type: 'word', data: { len: words.words[i].length } });
  const state = await once(a, 'tug:state', 5000);
  log('knot', state.knot, 'teal', state.teal, 'crimson', state.crimson);
  if (state.teal <= 0) fail('teal pull should be positive');
  log('tug OK');
  await emit(a, 'room:leave', undefined);
  await emit(b, 'room:leave', undefined);
  a.close(); b.close();
}

// ---- Test 4: Word War attack flow ----
async function testWordWar() {
  const a = await connect('userF', 'finn');
  const b = await connect('userG', 'gwen');
  const created = await emit(a, 'room:create', { mode: 'wordwar', settings: {} });
  await emit(b, 'room:join', { code: created.room.code });
  b.emit('room:ready', { ready: true });
  await wait(200);
  const startP = once(a, 'wordwar:start');
  const st = await emit(a, 'room:start', undefined);
  if (!st.ok) fail('wordwar start: ' + st.error);
  await startP;
  const state = await once(a, 'wordwar:state');
  const mine = state.players.find(p => p.name === 'finn');
  if (!mine.queue.length) fail('empty opening queue');
  const attackP = once(b, 'wordwar:attack', 20000);
  // finn keeps clearing his queue head -> streak of 5 fires junk at gwen
  const clearHead = (snap) => {
    const me = snap.players.find(p => p.name === 'finn');
    if (me?.queue[0]) a.emit('game:event', { type: 'word', data: { word: me.queue[0].word } });
  };
  a.on('wordwar:state', clearHead);
  clearHead(state);
  const attack = await attackP;
  a.off('wordwar:state', clearHead);
  log('attack fired from', attack.from.name, 'to', attack.to.name);
  log('wordwar OK');
  await emit(a, 'room:leave', undefined);
  await emit(b, 'room:leave', undefined);
  a.close(); b.close();
}

// ---- Test 5: Typo Royale elimination ----
async function testRoyale() {
  const a = await connect('userH', 'hana');
  const b = await connect('userI', 'ivan');
  const created = await emit(a, 'room:create', { mode: 'royale', settings: {} });
  await emit(b, 'room:join', { code: created.room.code });
  b.emit('room:ready', { ready: true });
  await wait(200);
  const roundP = once(a, 'royale:round');
  const st = await emit(a, 'room:start', undefined);
  if (!st.ok) fail('royale start: ' + st.error);
  const round = await roundP;
  const elimP = once(a, 'royale:eliminated', 40000);
  const overP = once(a, 'game:over', 50000);
  await wait(round.startAt - Date.now() + 200);
  a.emit('game:event', { type: 'progress', data: { chars: round.text.length, errors: 0 } });
  b.emit('game:event', { type: 'progress', data: { chars: 10, errors: 8 } });
  const elim = await elimP;
  if (elim.name !== 'ivan') fail('ivan should be cut, got ' + elim.name);
  log('eliminated', elim.name, 'round', elim.round);
  const over = await overP;
  if (over.results.winner.name !== 'hana') fail('hana should win');
  log('royale OK');
  await emit(a, 'room:leave', undefined);
  await emit(b, 'room:leave', undefined);
  a.close(); b.close();
}

// ---- Test 6: Boss Raid solo victory ----
async function testRaid() {
  const a = await connect('userJ', 'june');
  await emit(a, 'room:create', { mode: 'bossraid', settings: {} });
  const startP = once(a, 'raid:start');
  const sentenceP = once(a, 'raid:sentence');
  const st = await emit(a, 'room:start', undefined);
  if (!st.ok) fail('raid start: ' + st.error);
  const info = await startP;
  await sentenceP;
  log('boss', info.boss, 'hp', info.bossMax);
  const hitP = once(a, 'raid:hit');
  const overP = once(a, 'game:over', 20000);
  a.emit('game:event', { type: 'sentence', data: { chars: 120, errors: 0 } });
  const hit = await hitP;
  log('hit for', hit.dmg);
  // burn the boss down
  for (let i = 0; i < 40; i++) a.emit('game:event', { type: 'sentence', data: { chars: 200, errors: 0 } });
  const over = await overP;
  if (!over.results.victory) fail('expected raid victory');
  log('raid OK — boss down');
  await emit(a, 'room:leave', undefined);
  a.close();
}

// ---- Test 7: Relay baton and vote ----
async function testRelay() {
  const a = await connect('userK', 'kai');
  const b = await connect('userL', 'lea');
  const created = await emit(a, 'room:create', { mode: 'relay', settings: {} });
  await emit(b, 'room:join', { code: created.room.code });
  b.emit('room:ready', { ready: true });
  await wait(200);
  const chapterP = once(a, 'relay:chapter');
  const st = await emit(a, 'room:start', undefined);
  if (!st.ok) fail('relay start: ' + st.error);
  const ch = await chapterP;
  const typist = ch.typist.name === 'kai' ? a : b;
  log('chapter 1 typist', ch.typist.name);
  const doneP = once(a, 'relay:paradone');
  const voteP = once(a, 'relay:vote');
  await wait(ch.startAt - Date.now() + 200);
  typist.emit('game:event', { type: 'progress', data: { chars: ch.text.length, errors: 1, done: true } });
  const done = await doneP;
  log('paragraph done by', done.by, done.wpm, 'wpm');
  const vote = await voteP;
  const votedP = once(a, 'relay:voted');
  const ch2P = once(a, 'relay:chapter');
  a.emit('game:event', { type: 'vote', data: { choice: vote.choices[1] } });
  b.emit('game:event', { type: 'vote', data: { choice: vote.choices[1] } });
  const voted = await votedP;
  if (voted.choice !== vote.choices[1]) fail('vote should pick choice 1');
  const ch2 = await ch2P;
  if (ch2.chapter !== 2) fail('expected chapter 2');
  log('relay OK');
  await emit(a, 'room:leave', undefined);
  await emit(b, 'room:leave', undefined);
  a.close(); b.close();
}

// ---- Test 8: Corruptor roles and chapter board ----
async function testCorruptor() {
  const socks = await Promise.all([
    connect('userM', 'mia'), connect('userN', 'noa'), connect('userO', 'oli'),
  ]);
  const [a, b, c] = socks;
  const created = await emit(a, 'room:create', { mode: 'corruptor', settings: {} });
  await emit(b, 'room:join', { code: created.room.code });
  await emit(c, 'room:join', { code: created.room.code });
  b.emit('room:ready', { ready: true });
  c.emit('room:ready', { ready: true });
  await wait(200);
  const roles = socks.map(s => once(s, 'corruptor:role'));
  const chapterP = once(a, 'corruptor:chapter', 20000);
  const st = await emit(a, 'room:start', undefined);
  if (!st.ok) fail('corruptor start: ' + st.error);
  const dealt = await Promise.all(roles);
  const corruptors = dealt.filter(r => r.role === 'corruptor');
  if (corruptors.length !== 1) fail('exactly one corruptor expected');
  log('roles dealt, one corruptor');
  const ch = await chapterP;
  const boardP = once(a, 'corruptor:board', 20000);
  await wait(ch.startAt - Date.now() + 200);
  for (const s of socks) {
    s.emit('game:event', { type: 'progress', data: { chars: ch.text.length, errors: 1, done: true } });
  }
  const board = await boardP;
  if (board.board.length !== 3) fail('board should have 3 rows');
  log('team score', board.teamScore);
  log('corruptor OK');
  for (const s of socks) { await emit(s, 'room:leave', undefined); s.close(); }
}

try {
  await testSprint();
  await testHorde();
  await testTug();
  await testWordWar();
  await testRaid();
  await testRelay();
  await testCorruptor();
  await testRoyale();
  log('ALL TESTS PASSED');
  process.exit(0);
} catch (e) {
  fail(e.message);
}
