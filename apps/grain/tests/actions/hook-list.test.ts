import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/hook-list.ts";

Deno.test("hook-list: POSTs a filter object only when a filter is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { hooks: [{ id: "h1" }] } }]);
  const result = await action.execute(
    { filterHookType: "recording_added", filterState: "enabled" },
    ctx,
  );

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/hooks");
  assertEquals(JSON.parse(calls[0].body!), {
    filter: { hook_type: "recording_added", state: "enabled" },
  });
  assertEquals(result, { hooks: [{ id: "h1" }] });
});

Deno.test("hook-list: sends an empty body with no filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { hooks: [] } }]);
  await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("hook-list: defaults to an empty array when Grain omits hooks", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({}, ctx);
  assertEquals(result, { hooks: [] });
});

Deno.test("hook-list: is a search action", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "hook");
});
