import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/client-get-many.ts";

Deno.test("client-get-many: GETs /admin/clients and returns the wrapped shape", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [{ id: 1, name: "Jane" }], metadata: { items_count: 1, pages_count: 1 } } },
  ], { display: TEST_DISPLAY });
  const result = await action.execute({ search: "jane" }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/clients");
  assertEquals(queryOf(calls[0].url)["filter[search]"], "jane");
  assertEquals(result.data, [{ id: 1, name: "Jane" }]);
  assertEquals(result.metadata?.pages_count, 1);
});

Deno.test("client-get-many: passes pagination through", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }], { display: TEST_DISPLAY });
  await action.execute({ page: 2, onPage: 25 }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.page, "2");
  assertEquals(query.on_page, "25");
});
