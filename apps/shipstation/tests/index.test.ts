import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    appearance: { icon: { svg?: string; url?: string } };
  };
};

Deno.test("index: exports 18 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 18);
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

/** The actions that create a new resource or spend money on every call. */
Deno.test("index: the actions that duplicate or spend on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["label-create", "rate-get", "shipment-create", "warehouse-create"]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "account", "quota"]);
});

Deno.test("index: the manifest names only the V2 API host", () => {
  assertEquals(manifest.w6w.network.allow, ["api.shipstation.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.shipstation");
});

/**
 * The single most disorienting fact about this API — see `lib/client.ts`. Every
 * shipment/label action's description should orient a reader coming from the V1/UI
 * vocabulary rather than assuming they already know the rename.
 */
Deno.test("index: shipment and label actions cross-reference the V1 terminology rename", () => {
  const shipmentCreate = app.actions.find((a) => a.key === "shipment-create")!;
  const labelCreate = app.actions.find((a) => a.key === "label-create")!;
  assert(/order/i.test(shipmentCreate.description!), shipmentCreate.description);
  assert(/shipment.*ui|legacy V1/i.test(labelCreate.description!), labelCreate.description);
});

/** Label creation spends money — the description must say so plainly. */
Deno.test("index: label-create's description warns that it spends money", () => {
  const labelCreate = app.actions.find((a) => a.key === "label-create")!;
  assert(/SPENDS MONEY/.test(labelCreate.description!), labelCreate.description);
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks these
 * pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Prose in a param hint/description/label is not code. Concatenated
    // continuations count too, or half a two-line description survives.
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

Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/\bcredential\b/i.test(src), `${entry.name} reads the credential`);
  }
});

/** An address is somebody's home and a name is a person; a run log records ids and outcomes. */
Deno.test("index: no action logs an address, name, phone, or email", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (const forbidden of [/address_line/i, /\bname\b/i, /\bemail\b/i, /\bphone\b/i]) {
        assert(!forbidden.test(object), `${entry.name} logs personal data: ${object}`);
      }
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
  assertEquals(code('description: "a" +\n    "credential",').trim(), ",");
});
