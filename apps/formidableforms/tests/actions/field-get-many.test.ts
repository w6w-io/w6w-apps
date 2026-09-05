import { assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/field-get-many.ts";

Deno.test("field-get-many: GETs /forms/{form_id}/fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute({ formId: 25 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/25/fields`);
});
