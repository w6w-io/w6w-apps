import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    displayName: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { svg: string } };
  };
};

Deno.test("index: exports 8 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 8);
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

/** Anything that duplicates on a retry says so. */
Deno.test("index: the actions that duplicate on a retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["data-bulk-create", "data-create", "workflow-trigger"]);
});

Deno.test("index: data-delete is gated behind an explicit, required confirmation", () => {
  const action = app.actions.find((a) => a.key === "data-delete")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "data-delete has no confirmation flag");
  assertEquals(confirm!.required, true);
});

Deno.test("index: declares exactly one auth method — the admin token", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth![0].key, "admin-token");
  assertEquals(typeof app.auth![0].test, "function");
});

Deno.test("index: declares both health checks", () => {
  const keys = (app.healthChecks ?? []).map((h) => h.key).sort();
  assertEquals(keys, ["app", "service"]);
});

Deno.test("manifest: reverse-DNS id, 1-3 categories, wide network allow, real icon asset", async () => {
  assertEquals(manifest.w6w.id, "io.w6w.bubble");
  assertEquals(manifest.w6w.displayName, "Bubble");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.network.allow, ["*"]);
  const iconPath = new URL(`../${manifest.w6w.appearance.icon.svg}`, import.meta.url);
  const svg = await Deno.readTextFile(iconPath);
  assert(svg.includes("<svg"), "icon.svg must be a real SVG file");
});
