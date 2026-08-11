import { assert, assertEquals } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-get: reads the singular company endpoint with no id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "2789583992", name: "Psych", status: "active" } }]);
  const company = await companyGet.execute({}, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/v2/company");
  assertEquals(companyGet.params, []);
  assertEquals(company.name, "Psych");
});

Deno.test("company-get: declares no plan or usage field, because the response has none", () => {
  const keys = (companyGet.output as Array<{ key: string }>).map((o) => o.key);
  for (const invented of ["plan", "usage", "seats", "quota"]) {
    assert(!keys.includes(invented), `invented a ${invented} field the API does not return`);
  }
});
