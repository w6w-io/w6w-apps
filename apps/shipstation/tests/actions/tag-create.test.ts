import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-create.ts";

Deno.test("tag-create: posts to /v2/tags/:tag_name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "east_warehouse" } }]);
  const result = await action.execute!({ name: "east_warehouse" }, ctx) as { name: string };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/tags/east_warehouse");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.name, "east_warehouse");
});

Deno.test("tag-create: requires name", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "name");
  assertEquals(calls.length, 0);
});
