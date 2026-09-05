import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 12;

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
 * Devin's session-create, message-send and attachment-upload endpoints accept
 * no idempotency key of any kind, so every call starts a new, separately
 * billed action. The runtime may retry an action marked idempotent; marking
 * any of these `true` would turn one transient network error into a second
 * paid session or a duplicated instruction to a running agent.
 */
Deno.test("index: no session-creating or message-sending action is marked idempotent", () => {
  for (
    const key of ["session-create", "session-message-send", "attachment-upload", "secret-create"]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * Archive/terminate/delete move a resource toward one terminal state — the
 * end state after one call and after five is the same, so a retry is safe.
 */
Deno.test("index: state-terminal actions (archive/terminate/delete) are marked idempotent", () => {
  for (const key of ["session-archive", "session-terminate", "secret-delete"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: the App declares exactly one Auth method — API key", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
});

Deno.test("index: the App's egress allowlist is exactly api.devin.ai", async () => {
  // The health `service` check's own www.devinstatus.com host is declared on
  // that check's own `network.allow`, never on the App's — see health/service.ts.
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.devin.ai"]);
});

Deno.test("index: the service health check does not widen the App's own allowlist", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.network?.allow, ["www.devinstatus.com"]);
  assertEquals(service.credential, "none");
});
