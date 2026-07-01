import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-label.ts";

Deno.test("get-label: GETs users/me/labels/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "Label_1" } }]);
  await action.execute!({ labelId: "Label_1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/labels/Label_1");
  assertEquals(calls[0].method, "GET");
});
