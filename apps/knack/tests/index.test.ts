import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 5);
  assertEquals(app.auth!.length, 1);
  assertEquals(app.healthChecks!.length, 2);
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

/** Knack documents no idempotency key on record creation. */
Deno.test("index: record-create is not idempotent", () => {
  assertEquals(app.actions.find((a) => a.key === "record-create")?.idempotent, false);
});

Deno.test("index: record-update and record-delete are idempotent", () => {
  for (const key of ["record-update", "record-delete"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every action requires an objectKey param", () => {
  for (const a of app.actions) {
    const objectKey = a.params?.find((p) => p.key === "objectKey");
    assert(objectKey, `${a.key}: no objectKey param`);
    assertEquals(objectKey?.required, true, `${a.key}: objectKey not required`);
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
 * Strip comments so the sandbox guards below scan CODE, not prose — otherwise
 * a doc comment explaining why an action never touches the credential trips
 * the assertion, and deleting the explanation "fixes" it.
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
    assert(!/apiKey/i.test(src), `${a.key}: references the API key`);
  }
});

/** Knack's credential headers are named literally. Neither may appear in an action. */
Deno.test("index: no action sets Knack's auth headers itself", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/x-knack-application-id/i.test(src), `${a.key}: sets the Application ID header`);
    assert(!/x-knack-rest-api-key/i.test(src), `${a.key}: sets the API key header`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

Deno.test("index: no action hard-codes the API host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL literal`);
  }
});

Deno.test("index: the credential's fields are auth FIELDS, which is where they belong", () => {
  const fields = app.auth![0].fields ?? [];
  assertEquals(fields.map((f) => f.key), ["applicationId", "apiKey", "testObject"]);
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(fields.find((f) => f.key === "applicationId")?.type, "string");
  assertEquals(fields.find((f) => f.key === "testObject")?.type, "string");
});

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks!) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

Deno.test("index: every unavailable health check is informational", () => {
  for (const h of app.healthChecks!.filter((h) => h.unavailable)) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the credential. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  for (const h of app.healthChecks!) {
    if (!h.network?.allow?.length) continue;
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

Deno.test("index: the manifest allows exactly api.knack.com", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] } } };
  assertEquals(manifest.w6w.id, "io.w6w.knack");
  assertEquals(manifest.w6w.network.allow, ["api.knack.com"]);
});

/** The status host is declared on the health check, never on the app manifest. */
Deno.test("index: status.knack.com is not in the app's own network allowlist", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { network: { allow: string[] } } };
  assert(!manifest.w6w.network.allow.includes("status.knack.com"));
  const service = app.healthChecks!.find((h) => h.key === "service")!;
  assertEquals(service.network?.allow, ["status.knack.com"]);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// apiKey\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
