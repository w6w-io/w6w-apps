import { assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx, paramsOf } from "../_helpers.ts";
import action from "../../actions/view-get-many.ts";

Deno.test("view-get-many: GETs /views with the documented query names", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute({ formId: 25, page: 1, pageSize: 20, order: "ASC", orderBy: "id" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/views`);
  const params = paramsOf(calls);
  assertEquals(params.get("form_id"), "25");
  assertEquals(params.get("page_size"), "20");
});
