import { assertEquals } from "@std/assert";
import orderList from "../../actions/order-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { orders: [{ id: "1" }], next_page_token: "n" };

Deno.test("order-list: reads the orders collection", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await orderList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/orders");
  assertEquals(out.count, 1);
});

/**
 * A fourth spelling of the date window — `created_since_time` /
 * `created_until_time` — after contacts, tasks and emails. There is no shared
 * convention on this API.
 */
Deno.test("order-list: the date window uses this endpoint's own clause names", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await orderList.execute(
    { createdSinceTime: "2026-01-01T00:00:00.000Z", modifiedSinceTime: "2026-02-01T00:00:00.000Z" },
    ctx,
  );
  assertEquals(
    queryOf(calls[0].url).filter,
    "created_since_time==2026-01-01T00:00:00.000Z;modified_since_time==2026-02-01T00:00:00.000Z",
  );
});

/** `paid` is one of the very few boolean clauses in the filter grammar. */
Deno.test("order-list: the paid clause survives a literal false", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await orderList.execute({ paid: "false" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "paid==false");
});
