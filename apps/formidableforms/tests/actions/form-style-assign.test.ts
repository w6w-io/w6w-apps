import { assertEquals } from "@std/assert";
import { BASE_PATH, bodyOf, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-style-assign.ts";

Deno.test("form-style-assign: POSTs { style_id } to /form-styles/{form_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ formId: 25, styleId: 12 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/form-styles/25`);
  assertEquals(bodyOf(calls), { style_id: 12 });
});
