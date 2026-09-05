import { assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx, paramsOf } from "../_helpers.ts";
import action from "../../actions/style-get-many.ts";

Deno.test("style-get-many: GETs /styles with the documented query names", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute({ page: 1, pageSize: 20, order: "ASC", orderBy: "name", search: "x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/styles`);
  const params = paramsOf(calls);
  assertEquals(params.get("page_size"), "20");
  assertEquals(params.get("order_by"), "name");
});
