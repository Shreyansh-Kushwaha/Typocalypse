// Code snippet bank for /practice/code. Local so the mode works offline.
// Rules: 2-space indentation, ASCII only, 3-8 lines, realistic code.

export const LANGUAGES = ['javascript', 'typescript', 'python', 'sql', 'bash', 'rust'] as const;
export type Language = typeof LANGUAGES[number];

export const LANGUAGE_LABEL: Record<Language, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  sql: 'SQL',
  bash: 'Bash',
  rust: 'Rust',
};

const js: string[] = [
`function sum(list) {
  let total = 0;
  for (const n of list) {
    total += n;
  }
  return total;
}`,
`const users = await fetch('/api/users').then(r => r.json());
const active = users.filter(u => u.active && !u.banned);
console.log(active.map(u => u.name).join(', '));`,
`export function debounce(fn, ms = 200) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}`,
`const counts = {};
for (const word of text.split(/\\s+/)) {
  counts[word] = (counts[word] || 0) + 1;
}
const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];`,
`class Queue {
  constructor() { this.items = []; }
  push(item) { this.items.push(item); }
  pop() { return this.items.shift(); }
  get size() { return this.items.length; }
}`,
`app.get('/health', (req, res) => {
  const uptime = Math.round(process.uptime());
  res.json({ ok: true, uptime });
});`,
];

const ts: string[] = [
`interface Point {
  x: number;
  y: number;
}
function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}`,
`type Result<T> = { ok: true; value: T } | { ok: false; error: string };
function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}`,
`export async function retry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (err) { if (i === tries - 1) throw err; }
  }
  throw new Error('unreachable');
}`,
`const byId = new Map<string, User>();
for (const user of users) {
  byId.set(user.id, user);
}
const names: string[] = [...byId.values()].map(u => u.name);`,
`enum Status { Idle, Running, Done }
let status: Status = Status.Idle;
function start(): void {
  status = Status.Running;
}`,
`function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    (out[key(item)] ||= []).push(item);
  }
  return out;
}`,
];

const py: string[] = [
`def fib(n):
  a, b = 0, 1
  for _ in range(n):
    a, b = b, a + b
  return a`,
`import json
with open('config.json') as f:
  config = json.load(f)
port = config.get('port', 8080)
print(f"listening on {port}")`,
`class Stack:
  def __init__(self):
    self.items = []
  def push(self, item):
    self.items.append(item)
  def pop(self):
    return self.items.pop()`,
`squares = [x * x for x in range(10) if x % 2 == 0]
total = sum(squares)
print(total, max(squares))`,
`def read_lines(path):
  with open(path) as f:
    for line in f:
      line = line.strip()
      if line and not line.startswith('#'):
        yield line`,
`from collections import Counter
words = text.lower().split()
counts = Counter(words)
for word, n in counts.most_common(5):
  print(word, n)`,
];

const sql: string[] = [
`SELECT u.name, COUNT(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.name
ORDER BY orders DESC
LIMIT 10;`,
`CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  wpm INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`,
`UPDATE products
SET price = price * 0.9
WHERE category = 'books'
  AND stock > 100;`,
`SELECT date_trunc('day', created_at) AS day, AVG(wpm)
FROM sessions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY day;`,
`INSERT INTO users (name, email)
VALUES ('ada', 'ada@example.com')
ON CONFLICT (email) DO NOTHING;`,
`DELETE FROM logs
WHERE level = 'debug'
  AND created_at < NOW() - INTERVAL '30 days';`,
];

const bash: string[] = [
`#!/bin/bash
set -euo pipefail
for f in *.log; do
  gzip "$f"
done`,
`if [ -z "$1" ]; then
  echo "usage: $0 <name>"
  exit 1
fi
mkdir -p "build/$1"`,
`count=$(grep -c "ERROR" app.log)
if [ "$count" -gt 0 ]; then
  echo "found $count errors"
fi`,
`for host in web1 web2 db1; do
  ssh "$host" uptime || echo "$host is down"
done`,
`while read -r line; do
  echo "\${line^^}"
done < names.txt`,
`tar -czf "backup-$(date +%F).tar.gz" ./data
find . -name "backup-*.tar.gz" -mtime +7 -delete
echo "backup done: $(du -sh ./data | cut -f1)"`,
];

const rust: string[] = [
`fn main() {
  let nums = vec![1, 2, 3, 4];
  let total: i32 = nums.iter().sum();
  println!("total = {}", total);
}`,
`struct Point {
  x: f64,
  y: f64,
}
impl Point {
  fn len(&self) -> f64 { (self.x * self.x + self.y * self.y).sqrt() }
}`,
`fn divide(a: i32, b: i32) -> Result<i32, String> {
  if b == 0 {
    return Err("divide by zero".to_string());
  }
  Ok(a / b)
}`,
`let mut counts = HashMap::new();
for word in text.split_whitespace() {
  *counts.entry(word).or_insert(0) += 1;
}`,
`match value {
  Some(n) if n > 10 => println!("big"),
  Some(_) => println!("small"),
  None => println!("nothing"),
}`,
`fn largest<T: PartialOrd + Copy>(items: &[T]) -> T {
  let mut best = items[0];
  for &item in items {
    if item > best { best = item; }
  }
  best
}`,
];

export const SNIPPETS: Record<Language, string[]> = {
  javascript: js,
  typescript: ts,
  python: py,
  sql,
  bash,
  rust,
};

/** Normalise a snippet: tabs -> 2 spaces, CRLF -> LF, strip trailing spaces. */
export function normalizeSnippet(src: string): string {
  return src
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ')
    .split('\n')
    .map(l => l.replace(/\s+$/, ''))
    .join('\n')
    .trim();
}

/** Pick a random snippet index for a language, avoiding `exclude` when possible. */
export function randomSnippetIndex(lang: Language, exclude = -1): number {
  const list = SNIPPETS[lang];
  if (list.length <= 1) return 0;
  let i = Math.floor(Math.random() * list.length);
  while (i === exclude) i = Math.floor(Math.random() * list.length);
  return i;
}

export function getSnippet(lang: Language, index: number): string {
  return normalizeSnippet(SNIPPETS[lang][index] ?? SNIPPETS[lang][0]);
}
