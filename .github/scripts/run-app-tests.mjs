/**
 * Run each named app's tests, a few at a time, for scripts/verify.sh (CI and the pre-push hook).
 *
 *   node .github/scripts/run-app-tests.mjs apps/2chat apps/google/gmail …
 *
 * Per app: `npm test` (node:test on Node), then `npm run test:runtime` (Deno, the tests that
 * drive the real runtime sandbox) when the app declares one. An app whose test run reports zero
 * tests FAILS: a glob that matches nothing must never pass as green. Exits 1 on any failure and
 * prints the tail of each failing app's output.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const CONCURRENCY = Number(process.env.APP_TEST_CONCURRENCY ?? 8);
const TIMEOUT_MS = 10 * 60_000;

function run(cmd, args, cwd) {
  return new Promise((done) => {
    const p = spawn(cmd, args, { cwd, env: process.env });
    let out = "";
    p.stdout.on("data", (b) => (out += b));
    p.stderr.on("data", (b) => (out += b));
    const t = setTimeout(() => p.kill("SIGKILL"), TIMEOUT_MS);
    p.on("close", (code) => {
      clearTimeout(t);
      done({ code, out });
    });
  });
}

/** Node's reporter prints `ℹ pass N` (spec) or `# pass N` (tap); Deno prints `ok | N passed`. */
export function countPassed(out) {
  const node = /(?:ℹ|#) pass (\d+)/.exec(out);
  if (node) return Number(node[1]);
  const deno = /(\d+) passed/.exec(out.replace(/\x1b\[[0-9;]*m/g, ""));
  return deno ? Number(deno[1]) : 0;
}

async function testApp(dir) {
  const cwd = resolve(dir);
  const scripts = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")).scripts ?? {};
  const runs = [["npm", ["test", "--silent"]]];
  if (scripts["test:runtime"]) runs.push(["npm", ["run", "--silent", "test:runtime"]]);
  let passed = 0;
  for (const [cmd, args] of runs) {
    const { code, out } = await run(cmd, args, cwd);
    if (code !== 0) return { dir, ok: false, why: `${args.join(" ")} exited ${code}`, out };
    const n = countPassed(out);
    if (n === 0) return { dir, ok: false, why: `${args.join(" ")} ran zero tests`, out };
    passed += n;
  }
  return { dir, ok: true, passed };
}

const dirs = process.argv.slice(2);
if (dirs.length) {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < dirs.length) results.push(await testApp(dirs[next++]));
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, dirs.length) }, worker));
  const bad = results.filter((r) => !r.ok);
  for (const r of bad) console.error(`\n--- FAIL ${r.dir}: ${r.why}\n${r.out.slice(-3000)}`);
  const total = results.reduce((n, r) => n + (r.passed ?? 0), 0);
  console.log(`apps ${results.length}, failed ${bad.length}, tests passed ${total}`);
  if (bad.length) process.exit(1);
}
