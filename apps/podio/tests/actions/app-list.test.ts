import { assertEquals } from "@std/assert";
import appList from "../../actions/app-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("app-list: GETs the space's app collection", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ app_id: 1, config: { name: "Leads" } }] }]);
  const out = await appList.execute({ spaceId: "7" }, ctx);
  assertEquals(out, { apps: [{ app_id: 1, config: { name: "Leads" } }] });
  assertEquals(pathOf(calls[0].url), "/app/space/7/");
  assertEquals(queryOf(calls[0].url), {}, "an unset boolean must not be sent");
});

Deno.test("app-list: both settings of include_inactive are expressible", async () => {
  const on = mockCtx([{ body: [] }]);
  await appList.execute({ spaceId: "7", includeInactive: true }, on.ctx);
  assertEquals(queryOf(on.calls[0].url), { include_inactive: "true" });

  const off = mockCtx([{ body: [] }]);
  await appList.execute({ spaceId: "7", includeInactive: false }, off.ctx);
  assertEquals(queryOf(off.calls[0].url), { include_inactive: "false" });
});

/**
 * The documented short projection carries no `token`, but this and Get App
 * return the same kind of entity — a widened list projection must not be the
 * thing that decides whether the app token leaks.
 */
Deno.test("app-list: strips an app token from every element, should one ever appear", async () => {
  const { ctx } = mockCtx([{ body: [{ app_id: 1, token: "leaked" }, { app_id: 2 }] }]);
  assertEquals(await appList.execute({ spaceId: "7" }, ctx), {
    apps: [{ app_id: 1 }, { app_id: 2 }],
  });
});
