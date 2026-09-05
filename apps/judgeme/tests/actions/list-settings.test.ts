import { assertEquals } from "@std/assert";
import listSettings from "../../actions/list-settings.ts";
import { mockCtx, pathOf, queryAllOf } from "../_helpers.ts";

Deno.test("list-settings: with no keys, sends no query string at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { settings: { autopublish: true } } }]);
  const out = await listSettings.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/settings");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out, { settings: { autopublish: true } });
});

Deno.test("list-settings: repeats setting_keys[] once per key (exploded array)", async () => {
  const { ctx, calls } = mockCtx([{ body: { settings: {} } }]);
  await listSettings.execute({ settingKeys: ["admin_email", "autopublish"] }, ctx);

  assertEquals(queryAllOf(calls[0].url, "setting_keys[]"), ["admin_email", "autopublish"]);
});

Deno.test("list-settings: defaults to {} when the body carries no settings", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await listSettings.execute({}, ctx);
  assertEquals(out, { settings: {} });
});
