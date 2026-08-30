import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; appearance: { darkMode?: unknown } };
};

Deno.test("index: exports 28 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 28);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "perform", "trigger"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Anything that duplicates a side effect on a retry says so. */
Deno.test("index: the actions that duplicate on a retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(
    notIdempotent,
    [
      "company-create",
      "contact-create",
      "contact-points-add",
      "contact-points-subtract",
      "email-send-to-contact",
      "email-send-to-segment",
      "segment-create",
    ].sort(),
  );
});

/** The one destructive action is gated behind an explicit confirmation. */
Deno.test("index: contact-delete is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "contact-delete")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "contact-delete has no confirmation flag");
  assertEquals(confirm!.required, true);
});

/** Nothing else in this app can delete something a self-hosted instance cannot recover. */
Deno.test("index: no other action deletes anything", () => {
  const destructive = app.actions.filter((a) =>
    a.key.includes("delete") && a.key !== "contact-delete"
  );
  assertEquals(destructive, []);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["client-credentials"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["instance", "service"]);
});

/**
 * A self-hostable app cannot name its host. The wide allowlist is the price,
 * and it matches the posture the pack already uses for gitea and friends.
 */
Deno.test("index: the manifest is honest about being self-hostable", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.mautic");
});

Deno.test("index: the icon is the vendor's mark, in the vendor's colour", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Mautic</title>"), "the mark no longer names Mautic");
  assert(svg.toUpperCase().includes("#4E5E9E"), "the mark lost Mautic's brand colour");
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
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
