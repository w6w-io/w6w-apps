import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 23;

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
 * AgencyZoom's write endpoints accept no idempotency key of any kind (no
 * `X-Idempotency-Key` header, no client-supplied id field documented
 * anywhere), so every `false` below is a real design decision — a retried
 * create really would duplicate a lead, a policy, a task or a sale.
 */
Deno.test("index: every action that creates a new record is marked non-idempotent", () => {
  for (
    const key of ["lead-create", "lead-note-create", "lead-sold", "policy-create", "task-create"]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/** The converse: these converge to the same end state on a retry with the same input. */
Deno.test("index: state-setting actions are marked idempotent", () => {
  for (
    const key of [
      "lead-update",
      "lead-change-status",
      "policy-update-status",
      "task-complete",
      "task-delete",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
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
 * doc comments in this app explain in detail why `X-Api-Token`/`credential`
 * are mentioned at all, which would otherwise trip these assertions.
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
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/x-api-token/i.test(src), `${a.key}: sets the policies/create header itself`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/** The API origin lives in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/agencyzoom\.com/.test(src), `${a.key}: contains an AgencyZoom host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|jwt|username|password)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the credential fields are declared secret where they must be", () => {
  const [method] = app.auth;
  assertEquals(method.key, "login");
  assertEquals(method.type, "custom");
  const password = method.fields?.find((f) => f.key === "password");
  assertEquals(password?.type, "secret");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
  assertEquals(typeof method.exchange, "function");
  assertEquals(typeof method.refresh, "function");
});

/**
 * The auth probe is pinned by path. AgencyZoom's obvious "whoami" equivalent,
 * `PUT /v1/api/profile/my`, is a PUT with no matching GET — this app uses
 * `GET /v1/api/employees` instead, which exists, needs a credential, and
 * returns no secret.
 */
Deno.test("index: the auth probe is GET /employees", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/login.ts", import.meta.url)));
  assert(src.includes("/employees"), "auth probe no longer hits /employees");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * Both declared health checks in this app are absences (no status page, no
 * rate-limit header) — an `unavailable` entry always reports `unknown`, and
 * `unknown` outranks `ok` in a roll-up, so every one MUST be `informational`
 * or it pins the app's verdict at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assertEquals(unavailable.length, 2, "expected both declared health checks to be absences");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and declares the vendor icon", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      network: { allow: string[] };
      appearance: { icon: { url: string; alt?: string } };
      categories: string[];
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.agencyzoom");
  assertEquals(manifest.w6w.network.allow, ["api.agencyzoom.com"]);
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
  assert(manifest.w6w.appearance.icon.alt);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});

Deno.test("index: the icon file exists and decodes as a PNG", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals(Array.from(bytes.slice(0, 8)), [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
