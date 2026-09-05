import { assertEquals } from "@std/assert";
import fieldUpdate from "../../actions/field-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("field-update: PATCHes /v2/fields/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, message: "Field successfully updated" },
  }]);
  await fieldUpdate.execute({ id: "f1", title: "Changing title", show: true }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/fields/f1");
  assertEquals(JSON.parse(calls[0].body!), { title: "Changing title", show: true });
});
