import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/salesorder-list.ts";

Deno.test("salesorder-list: GETs /salesorders with organization_id and unwraps `salesorders`", async () => {
  const { ctx, calls } = mockInventoryCtx([
    {
      body: {
        code: 0,
        message: "success",
        salesorders: [{ salesorder_id: "1", salesorder_number: "SO-00001" }],
        page_context: { page: 1, per_page: 200, has_more_page: false },
      },
    },
  ]);
  const out = await action.execute({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/salesorders");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(out.data, [{ salesorder_id: "1", salesorder_number: "SO-00001" }]);
  assertEquals(out.pageContext, { page: 1, per_page: 200, has_more_page: false });
});

/** The path is `/salesorders` (one word) but the resource key is a separate name. */
Deno.test("salesorder-list: the path segment is not the resource key", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", salesorders: [] } },
  ]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/inventory/v1/salesorders");
});
