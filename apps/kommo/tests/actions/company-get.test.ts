import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-get.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("company-get: GETs /companies/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1247556, name: "Atlas Co." } }], conn);
  const out = await action.execute!({ id: 1247556 }, ctx);
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/companies/1247556");
  assertEquals(out.company, { id: 1247556, name: "Atlas Co." });
});

Deno.test("company-get: type is read, and resource is company", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "company");
});
