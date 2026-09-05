import { assertEquals } from "@std/assert";
import profileList from "../../actions/profile-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("profile-list: GETs /profiles and wraps the bare array as items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, type: "PERSONAL" }] }]);
  const out = await profileList.execute({}, ctx) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles");
  assertEquals(out.items, [{ id: 1, type: "PERSONAL" }]);
});

Deno.test("profile-list: an empty response wraps to an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const out = await profileList.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});

Deno.test("profile-list: is a search action requiring no params", () => {
  assertEquals(profileList.type, "search");
  assertEquals(profileList.params, []);
});
