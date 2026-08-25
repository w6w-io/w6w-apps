import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-list.ts";

Deno.test("tag-list: GETs /v2/tags and unwraps a {tags: [...]} body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tags: ["east_warehouse", "fragile"] } }]);
  const result = await action.execute!({}, ctx) as { tags: string[] };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/tags");
  assertEquals(result.tags, ["east_warehouse", "fragile"]);
});

Deno.test("tag-list: also tolerates a bare array response", async () => {
  const { ctx } = mockCtx([{ status: 200, body: ["east_warehouse"] }]);
  const result = await action.execute!({}, ctx) as { tags: string[] };
  assertEquals(result.tags, ["east_warehouse"]);
});
