import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-list.ts";

Deno.test("get-list: GETs {site}/lists/{list-id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "L1" } }]);
  await action.execute({ listId: "L1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/lists/L1");
});

Deno.test("get-list: $expand rides as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ listId: "L1", expand: ["columns", "items"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$expand"), "columns,items");
});
