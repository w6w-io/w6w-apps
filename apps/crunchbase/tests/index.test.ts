import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { url: string; alt?: string } };
  };
};

Deno.test("index: exports 7 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 7);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  const validTypes = new Set(["read", "search", "perform", "control"]);
  for (const action of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), `bad key: ${action.key}`);
    assert(validTypes.has(action.type), `bad type on ${action.key}`);
  }
});

/** The API is entirely read-only, so no action should ever be `perform`. */
Deno.test("index: no action is `perform` — the Crunchbase API has no write endpoint", () => {
  for (const action of app.actions) {
    assert(action.type !== "perform", `${action.key} is declared perform on a read-only API`);
  }
});

Deno.test("index: exports the one auth method and both declared-absence health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["api-key"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest points at the real host and a valid category set", () => {
  assertEquals(manifest.w6w.id, "io.w6w.crunchbase");
  assertEquals(manifest.w6w.network.allow, ["api.crunchbase.com"]);
  assertEquals(manifest.w6w.categories, ["crm", "analytics"]);
  assertEquals(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3, true);
});

Deno.test("index: the icon is the vendor's own asset", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals(bytes.byteLength, 4752);
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(manifest.w6w.appearance.icon.alt, "Crunchbase");
});

/**
 * Every action must call the real `/data/...` base path this app was verified
 * against — never a bare `/v4/...` or some other guessed shape.
 */
Deno.test("index: every action calls the real /data base path", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const paths = [...src.matchAll(/request\(\s*[`"]([^`"]+)/g)].map((m) => m[1]);
    assert(paths.length > 0, `${entry.name} makes no request`);
    for (const p of paths) {
      assert(
        p.startsWith("/autocompletes") || p.startsWith("/searches/") ||
          p.startsWith("/entities/"),
        `${entry.name} calls ${p}, which is not a documented /data path`,
      );
    }
  }
});

/** The sandbox rules that can only be seen in source. */
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
    assert(!/x-cb-user-key/i.test(src), `${entry.name} stamps the API key`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// x-cb-user-key\nconst a = 1;").trim(), "const a = 1;");
});
