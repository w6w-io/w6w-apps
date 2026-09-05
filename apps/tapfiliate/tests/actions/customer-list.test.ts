import { assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { linkHeader, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-list: builds the query from snake_case wire names and returns nextPage", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: "cu_1" }], headers: { link: linkHeader(2, "/1.6/customers/") } },
  ]);
  const out = await customerList.execute(
    {
      programId: "johns-affiliate-program",
      customerId: "USER123",
      affiliateId: "janejameson",
      dateFrom: "2022-01-01",
      dateTo: "2025-12-31",
      page: 1,
    },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/customers/");
  assertEquals(queryOf(calls[0].url), {
    program_id: "johns-affiliate-program",
    customer_id: "USER123",
    affiliate_id: "janejameson",
    date_from: "2022-01-01",
    date_to: "2025-12-31",
    page: "1",
  });
  assertEquals(out.items, [{ id: "cu_1" }]);
  assertEquals(out.nextPage, 2);
});

Deno.test("customer-list: an empty input sends no query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await customerList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(queryOf(calls[0].url), {});
});
