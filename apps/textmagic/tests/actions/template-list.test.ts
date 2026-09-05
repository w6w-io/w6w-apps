import { assertEquals } from "@std/assert";
import templateList from "../../actions/template-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("template-list: GETs /templates with pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 519 }]) }]);
  await templateList.execute({ page: 1, limit: 50 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/templates");
  assertEquals(queryOf(calls[0].url), { page: "1", limit: "50" });
});
