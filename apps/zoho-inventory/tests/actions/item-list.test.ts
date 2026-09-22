import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/item-list.ts";

Deno.test("item-list: GETs /items with organization_id and pagination", async () => {
  const { ctx, calls } = mockInventoryCtx([
    {
      body: {
        code: 0,
        message: "success",
        items: [{ item_id: "1", name: "Hard Drive" }],
        page_context: { page: 1, per_page: 200, has_more_page: false },
      },
    },
  ]);
  const out = await action.execute({ page: 1, per_page: 200 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/items");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(url.searchParams.get("per_page"), "200");
  assertEquals(out.data, [{ item_id: "1", name: "Hard Drive" }]);
  assertEquals(out.pageContext, { page: 1, per_page: 200, has_more_page: false });
});

Deno.test("item-list: no organization on the connection and none passed is an actionable error", async () => {
  const { ctx } = mockInventoryCtx([], "www.zohoapis.com", "");
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("organizationId"), true);
});
