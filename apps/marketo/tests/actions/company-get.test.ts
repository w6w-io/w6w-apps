import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-get.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("company-get: GETs /rest/v1/companies.json with filterType/filterValues", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [{ id: 3433, company: "Google" }] } },
  ], conn);
  const out = await action.execute!({ filterType: "id", filterValues: "3433" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v1/companies.json");
  assertEquals(url.searchParams.get("filterType"), "id");
  assertEquals(out, [{ id: 3433, company: "Google" }]);
});

Deno.test("company-get: requires filterType and filterValues", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ filterType: "", filterValues: "" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
