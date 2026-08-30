import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import accountList from "../../actions/account-list.ts";

Deno.test("account-list: returns the accounts connection, filtered by type", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        business: {
          accounts: {
            pageInfo: { currentPage: 1, totalPages: 1, totalCount: 1 },
            edges: [{ node: { id: "a1", name: "Sales", type: { value: "INCOME" } } }],
          },
        },
      },
    },
  }]);
  const out = await accountList.execute(
    { businessId: "b1", types: "INCOME, OTHER_INCOME" },
    ctx,
  ) as { edges: unknown[] };
  assertEquals(out.edges.length, 1);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.types, ["INCOME", "OTHER_INCOME"]);
});

Deno.test("account-list: type/resource metadata", () => {
  assertEquals(accountList.type, "search");
  assertEquals(accountList.resource, "account");
});
