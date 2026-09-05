import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 32;

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
 * `task-create` and `task-send-message` accept no idempotency key of any
 * kind, so a retried call risks a second billed task or a duplicated
 * instruction to an already-resumed agent. `file-upload` and
 * `project-create`/`webhook-create` similarly create a new resource on every
 * call with no documented uniqueness constraint. `task-confirm-action`
 * resumes agent processing with no documented dedupe guarantee.
 */
Deno.test("index: no task-creating, message-sending or resource-creating action is marked idempotent", () => {
  for (
    const key of [
      "task-create",
      "task-send-message",
      "task-confirm-action",
      "project-create",
      "file-upload",
      "webhook-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * Stop/update/delete/publish move a resource toward one target state — the
 * end state after one call and after five is the same, so a retry is safe.
 */
Deno.test("index: state-convergent actions are marked idempotent", () => {
  for (
    const key of [
      "task-update",
      "task-stop",
      "task-delete",
      "agent-update",
      "file-delete",
      "webhook-delete",
      "website-publish",
      "website-update",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: the App declares exactly one Auth method — API key", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.auth[0].apiKey, { in: "header", name: "x-manus-api-key" });
});

Deno.test("index: the App's egress allowlist is exactly api.manus.ai", async () => {
  // The health `service` check's own status.manus.im host is declared on
  // that check's own `network.allow`, never on the App's — see health/service.ts.
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.manus.ai"]);
});

Deno.test("index: the service health check does not widen the App's own allowlist", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.network?.allow, ["status.manus.im"]);
  assertEquals(service.credential, "none");
});

Deno.test("index: the quota health check requires a signed, connection-scoped credential", () => {
  const quota = app.healthChecks.find((c) => c.key === "quota")!;
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
