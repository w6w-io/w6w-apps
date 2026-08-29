import { assertEquals } from "@std/assert";
import companyList from "../../actions/company-list.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("company-list: posts filters to /v2/companies/list", async () => {
  const { ctx, calls } = mockCtx([{ body: { companies: [], hasNextPage: false, cursor: null } }]);
  await companyList.execute({ search: "acme", limit: 20 }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v2/companies/list");
  assertEquals(bodyOf(calls[0]), { search: "acme", limit: 20 });
});
