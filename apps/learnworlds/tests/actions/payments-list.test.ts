import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payments-list.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("payments-list: GETs /v2/payments and forwards filters with LearnWorlds' own param names", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: {} } }], conn);
  await action.execute!(
    { productType: "course", userId: "u1", productId: "p1", page: 1, itemsPerPage: 50 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/api/v2/payments");
  assertEquals(url.searchParams.get("product_type"), "course");
  assertEquals(url.searchParams.get("user_id"), "u1");
  assertEquals(url.searchParams.get("product_id"), "p1");
  assertEquals(url.searchParams.get("items_per_page"), "50");
});
