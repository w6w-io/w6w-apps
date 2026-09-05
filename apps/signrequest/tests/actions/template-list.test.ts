import { assertEquals } from "@std/assert";
import templateList from "../../actions/template-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("template-list: GETs /templates/ with page/limit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await templateList.execute({ page: 1, limit: 5 }, ctx);
  assertEquals(pathOf(calls[0]), "/api/v1/templates/");
  assertEquals(queryOf(calls[0]).get("limit"), "5");
});
