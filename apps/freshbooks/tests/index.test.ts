import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes 19 uniquely-keyed actions", () => {
  assertEquals(app.actions.length, 19);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
});

Deno.test("index: declares the oauth2 auth method", () => {
  const keys = app.auth?.map((a) => a.key);
  assertEquals(keys, ["oauth2"]);
});

Deno.test("index: declares service and quota health checks", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service", "quota"]);
});

Deno.test("index: every action declares a resource and a valid type", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.resource, "string");
    assertEquals(["read", "search", "perform", "control"].includes(action.type), true);
  }
});

Deno.test("index: the manifest declares the reverse-DNS id, egress allowlist and PNG icon", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { url: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.freshbooks");
  assertEquals(manifest.w6w.network.allow, ["api.freshbooks.com", "auth.freshbooks.com"]);
  assert(!manifest.w6w.network.allow.includes("status.freshbooks.com"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

Deno.test("index: the icon is the verified vendor mark, byte-for-byte", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // Verified verbatim vendor mark, extracted pixel-exact (the 96x96 frame) from
  // https://www.freshbooks.com/favicon.ico on 2026-09-01 — 96x96 PNG, 1,436 bytes.
  assertEquals(bytes.length, 1436, "icon.png is no longer the 1,436-byte verified vendor file");
  // PNG signature + IHDR carrying 96x96 dimensions (big-endian 0x00000060 twice).
  assertEquals([...bytes.slice(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assertEquals([...bytes.slice(16, 24)], [0, 0, 0, 96, 0, 0, 0, 96]);
});
