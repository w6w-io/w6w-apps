import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 11 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 11);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(
      ["read", "search", "perform", "trigger"].includes(a.type),
      `${a.key} has type ${a.type}`,
    );
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Sending an event twice creates two events; deleting twice is still one job either way. */
Deno.test("index: only track-event and bulk-delete are not idempotent", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["bulk-delete", "track-event"]);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["integration-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

/** Five regions, two host families each, plus the status page. */
Deno.test("index: the manifest names all ten regional hosts plus the status page", () => {
  assertEquals(manifest.w6w.network.allow, [
    "app.pendo.io",
    "app.eu.pendo.io",
    "us1.app.pendo.io",
    "app.jpn.pendo.io",
    "app.au.pendo.io",
    "data.pendo.io",
    "data.eu.pendo.io",
    "us1.data.pendo.io",
    "data.jpn.pendo.io",
    "data.au.pendo.io",
    "status.pendo.io",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.pendo");
  assertEquals(manifest.w6w.categories, ["analytics"]);
});

/** Deletion is permanent and irreversible, so it takes a deliberate second input. */
Deno.test("index: bulk-delete takes an explicit confirmation param", () => {
  const action = app.actions.find((a) => a.key === "bulk-delete")!;
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(keys.includes("confirmPermanentDeletion"), keys.join(","));
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(
      /\b(hint|description|label|placeholder|title|reason|message)\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
      "",
    );

Deno.test("index: no action reaches the network except through ctx.fetch", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(
      !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
      `${entry.name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(src), `${entry.name} touches Deno.*`);
  }
});

/**
 * Two credentials share one header name — an action reaching for either
 * directly would take signing out of the one hook allowed to hold it.
 */
Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/x-pendo-integration-key/i.test(src), `${entry.name} sets the integration-key header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
    assert(!/trackEventSecretKey/i.test(src), `${entry.name} touches the track event secret`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// credential\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
});
