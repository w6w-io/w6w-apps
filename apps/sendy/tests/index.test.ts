import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories?: string[] };
};

Deno.test("index: exports 8 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 8);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Creating a campaign duplicates on retry; everything else is a safe re-send. */
Deno.test("index: only campaign-create is non-idempotent", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key);
  assertEquals(notIdempotent, ["campaign-create"]);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "site"]);
});

/**
 * A self-hostable app whose install can live at an arbitrary path cannot
 * name its hosts. The wide allowlist is the price.
 */
Deno.test("index: the manifest is honest about being self-hostable", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.sendy");
});

Deno.test("index: categories are within the 1-3 controlled-vocabulary bound", () => {
  const categories = manifest.w6w.categories ?? [];
  assert(categories.length >= 1 && categories.length <= 3);
});

Deno.test("index: the icon is the vendor's own mark", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.startsWith("<svg"), "icon.svg is not an SVG");
  assert(svg.includes('aria-label="Sendy"'), "the mark no longer names Sendy");
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

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
    assert(!/api_key\s*[:=]\s*["'\`]?\w/.test(src), `${entry.name} sets api_key itself`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
