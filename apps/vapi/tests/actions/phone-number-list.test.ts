import { assertEquals } from "@std/assert";
import phoneNumberList from "../../actions/phone-number-list.ts";
import { mockCtx, pageEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("phone-number-list: calls GET /v2/phone-number and unwraps {results, metadata}", async () => {
  const { ctx, calls } = mockCtx([
    { body: pageEnvelope([{ id: "pn1" }], { currentPage: 2, totalPages: 5, hasNextPage: true }) },
  ]);
  const out = await phoneNumberList.execute({ page: 2 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/phone-number");
  assertEquals(queryOf(calls[0].url), { page: "2" });
  assertEquals(out, {
    items: [{ id: "pn1" }],
    totalItems: 1,
    currentPage: 2,
    totalPages: 5,
    hasNextPage: true,
  });
});

Deno.test("phone-number-list: this is the one list action paginating by page, not createdAt", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await phoneNumberList.execute({ search: "sales", sortBy: "cost", sortOrder: "ASC" }, ctx);
  assertEquals(queryOf(calls[0].url), { search: "sales", sortBy: "cost", sortOrder: "ASC" });
});
