import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { HOSTS } from "../lib/client.ts";

const ACTION_COUNT = 11;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Every write in this app's surface either starts a new resource (a
 * conversation, a message, a content fragment — each a fresh, billed
 * generation on retry) or documents no idempotency key at all. Only
 * cancelling a generation is safe to retry: cancelling an already-cancelled
 * id is a no-op, not a second side effect.
 */
Deno.test("index: only conversation-cancel is marked idempotent among the performs", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  const idempotent = performs.filter((a) => a.idempotent).map((a) => a.key);
  assertEquals(idempotent, ["conversation-cancel"]);
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — several
 * action files explain in a doc comment why they never touch a credential.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
  }
});

Deno.test("index: no action calls the global fetch — ctx.fetch only", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/[^.]\bfetch\(/.test(src), `${a.key}: calls fetch directly instead of ctx.fetch`);
  }
});

Deno.test("index: auth declares a test hook and no bare fetch outside sign/test/afterConnect", () => {
  const auth = app.auth[0];
  assertEquals(auth.key, "api-key");
  assertEquals(typeof auth.test, "function");
  assertEquals(typeof auth.sign, "function");
});

Deno.test("index: the client can only ever build a URL against the app's two declared hosts", async () => {
  // network.allow lives in package.json, not on the runtime AppDefinition — this
  // pins HOSTS (what lib/client.ts resolves a region to) against it instead.
  const pkg = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { network: { allow: string[] } } };
  const declaredHosts = new Set(pkg.w6w.network.allow);
  for (const host of Object.values(HOSTS)) {
    assert(declaredHosts.has(new URL(host).hostname), `${host} not in network.allow`);
  }
  assertEquals(declaredHosts.size, Object.values(HOSTS).length);
});

Deno.test("index: every health check key is unique and kebab-case", () => {
  const keys = app.healthChecks!.map((h) => h.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate health check key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: a health check either has a check hook or declares unavailable", () => {
  for (const h of app.healthChecks!) {
    assert(
      typeof h.check === "function" || h.unavailable !== undefined,
      `${h.key}: neither a check hook nor an unavailable reason`,
    );
  }
});
