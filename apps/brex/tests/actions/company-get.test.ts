import { assertEquals } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const COMPANY = {
  id: "company_1",
  legal_name: "Brex Inc.",
  mailing_address: { line1: "1 Market St", city: "San Francisco", country: "US" },
  accountType: "BREX_EMPOWER",
};

Deno.test("company-get: GETs the company with no params and no query", async () => {
  const { ctx, calls } = mockCtx([{ body: COMPANY }]);
  const result = await companyGet.execute({}, ctx) as typeof COMPANY;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/company");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(result, COMPANY);
});

/** Brex's own mixed naming: `legal_name` snake_case, `accountType` camelCase. */
Deno.test("company-get: the mixed field names are passed through verbatim", async () => {
  const { ctx } = mockCtx([{ body: COMPANY }]);
  const result = await companyGet.execute({}, ctx) as typeof COMPANY;

  assertEquals(result.legal_name, "Brex Inc.");
  assertEquals(result.accountType, "BREX_EMPOWER");
});

/**
 * `accountType` is the account-level distinction behind several of this API's
 * entitlement gates, so the action exists partly to read it before something
 * gated is attempted.
 */
Deno.test("company-get: it declares a read with no parameters", () => {
  assertEquals(companyGet.type, "read");
  assertEquals(companyGet.params, []);
  const output = companyGet.output as Array<{ key: string }>;
  assertEquals(output.some((o) => o.key === "accountType"), true);
});
