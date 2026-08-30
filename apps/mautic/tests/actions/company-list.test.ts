import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-list.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("company-list: GETs /companies and unwraps the `companies` map", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { total: 1, companies: { "1": { id: 1, companyname: "Acme" } } } },
  ], conn);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url.startsWith("https://mautic.example.com/api/companies"), true);
  assertEquals(out, [{ id: 1, companyname: "Acme" }]);
});
