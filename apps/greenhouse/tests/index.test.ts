import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 24;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 2);
  assertEquals(app.healthChecks.length, 4);
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
 * Harvest v3 accepts no idempotency key on any endpoint, so a retry is a second
 * real call. Every one of these leaves a different world behind on the second
 * attempt — a duplicate person, a duplicate note, or a 422 because the
 * application has already left `from_stage_id`. Marking any of them idempotent
 * would let the runtime retry a network blip into a duplicate hire.
 */
Deno.test("index: no state-creating or lifecycle action is marked idempotent", () => {
  for (
    const key of [
      "create-candidate",
      "create-application",
      "create-note",
      "move-application",
      "reject-application",
      "hire-application",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: a PATCH that
 * touches only the keys present in the body genuinely does leave the same end
 * state when repeated, and saying so is what lets the runtime recover from a
 * dropped connection instead of failing the run.
 */
Deno.test("index: the one genuinely-retryable write is marked idempotent", () => {
  assertEquals(app.actions.find((a) => a.key === "update-candidate")?.idempotent, true);
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

Deno.test("index: no action declares a duplicate param key", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
  }
});

/**
 * A cursor is only usable if the action that produced it also declares one, and
 * only paged if `nextCursor` is published as an output. Every search action here
 * pages, so both must be true of all of them — a list action missing either is
 * one whose page two is unreachable.
 */
Deno.test("index: every search action offers a cursor param and a nextCursor output", () => {
  const searches = app.actions.filter((a) => a.type === "search");
  assertEquals(searches.length, 17);
  for (const a of searches) {
    assert((a.params ?? []).some((p) => p.key === "cursor"), `${a.key}: no cursor param`);
    const output = Array.isArray(a.output) ? a.output : [];
    assert(output.some((f) => f.key === "nextCursor"), `${a.key}: no nextCursor output`);
  }
});

/**
 * `per_page` must never carry a default. Greenhouse answers 422 for a cursor
 * sent alongside any other parameter, so a prefilled page size would break page
 * two of every paged workflow — and it would do so only on the second run, which
 * is the worst time to find out.
 */
Deno.test("index: no search action prefills a page size", () => {
  for (const a of app.actions.filter((a) => a.type === "search")) {
    const perPage = (a.params ?? []).find((p) => p.key === "perPage");
    assert(perPage !== undefined, `${a.key}: no perPage param`);
    assertEquals(perPage?.default, undefined, `${a.key}: perPage must not carry a default`);
  }
});

Deno.test("index: both auth methods expose test, sign, exchange and refresh", () => {
  assertEquals(app.auth.map((m) => m.key).sort(), ["api-key", "oauth-client-credentials"]);
  for (const method of app.auth) {
    assertEquals(typeof method.test, "function", `${method.key}: no test`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign`);
    assertEquals(typeof method.exchange, "function", `${method.key}: no exchange`);
    assertEquals(typeof method.refresh, "function", `${method.key}: no refresh`);
  }
});

Deno.test("index: every auth field that holds a credential is a secret", () => {
  for (const method of app.auth) {
    for (const field of method.fields ?? []) {
      if (/token|secret|password|key|client/i.test(field.key)) {
        assert(
          field.type === "secret" || field.secret === true,
          `${method.key}/${field.key} is not secret`,
        );
      }
    }
  }
});

Deno.test("index: health checks are keyed uniquely and each is a probe or a declared absence", () => {
  const keys = app.healthChecks.map((c) => c.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const check of app.healthChecks) {
    const hasHook = typeof check.check === "function";
    const declaresAbsence = check.unavailable !== undefined;
    assert(hasHook !== declaresAbsence, `${check.key}: must be exactly one of probe or absence`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up — so at any other severity a declared absence would pin the
 * app's verdict at `unknown` forever.
 */
Deno.test("index: every declared absence is informational", () => {
  const absences = app.healthChecks.filter((c) => c.unavailable !== undefined);
  assertEquals(absences.length, 1);
  for (const check of absences) {
    assertEquals(check.severity, "informational", `${check.key}`);
    assert((check.unavailable?.reason ?? "").length > 40, `${check.key}: reason too thin`);
  }
});

/**
 * The spec binds `network` widening to an unsigned posture: a check that reaches
 * an extra host must never be routed through `sign`, because those extra hosts
 * are exactly the third parties that must not see a credential.
 */
Deno.test("index: no check both widens egress and carries a credential", () => {
  for (const check of app.healthChecks) {
    if (check.network?.allow?.length) {
      assert(
        check.credential === "none" || check.credential === "context",
        `${check.key}: widens egress with credential posture ${check.credential}`,
      );
    }
  }
});

/**
 * The status host is deliberately NOT in the app-wide allowlist — it gets its
 * own per-hook grant instead, so an Action can never reach it.
 */
Deno.test("index: the status host is granted to the service check only", () => {
  const service = app.healthChecks.find((c) => c.key === "service");
  assertEquals(service?.network?.allow, ["status.greenhouse.io"]);
  for (const check of app.healthChecks.filter((c) => c.key !== "service")) {
    assertEquals(check.network, undefined, `${check.key} should not widen egress`);
  }
});
