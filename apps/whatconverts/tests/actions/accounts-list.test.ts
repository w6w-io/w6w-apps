import { assertEquals } from "@std/assert";
import accountsList from "../../actions/accounts-list.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("accounts-list defaults accounts_per_page to 25", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { accounts: [] } }]);
  await accountsList.execute({}, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/accounts?accounts_per_page=25`);
});

Deno.test("accounts-list forwards pagination and ordering filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { accounts: [] } }]);
  await accountsList.execute({
    accountsPerPage: 100,
    pageNumber: 3,
    startDate: "2015-11-10",
    endDate: "2015-12-01",
    order: "asc",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    accounts_per_page: "100",
    page_number: "3",
    start_date: "2015-11-10",
    end_date: "2015-12-01",
    order: "asc",
  });
});
