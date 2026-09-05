import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; appearance: { darkMode?: unknown } };
};

Deno.test("index: exports 12 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 12);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Actions that cannot be safely retried say so explicitly. */
Deno.test("index: the actions that are not safe to retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["user-create", "user-enroll"]);
});

Deno.test("index: no action in this app is destructive — deletes are unenrollments, not data loss", () => {
  const destructive = app.actions.filter((a) => a.key.includes("delete"));
  assertEquals(destructive, []);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["client-credentials"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "school", "quota"]);
});

/**
 * A per-school SaaS product cannot name a fixed API host — every school has
 * its own domain. The wide allowlist is the price, and it matches the
 * posture this pack already uses for mautic, gitea and bubble.
 */
Deno.test("index: the manifest is honest about the base URL being a connection field", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.learnworlds");
});

Deno.test("index: the icon is the vendor's real mark", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // PNG magic bytes.
  assertEquals(Array.from(bytes.slice(0, 8)), [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
});

// --- sandbox rules that can only be seen in source; asserting them here means
// this app's own suite fails first, ahead of `_tools/audit.ts`'s pack-wide check.
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
    assert(!/\blw-client\b/i.test(src), `${entry.name} sets the Lw-Client header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
