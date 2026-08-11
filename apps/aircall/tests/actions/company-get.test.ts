import { assertEquals } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { entityBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-get: reads GET /v1/company and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: entityBody("company", { name: "Acme Inc.", users_count: 146, numbers_count: 28 }) },
  ]);
  const out = await companyGet.execute({}, ctx) as { name: string; users_count: number };

  assertEquals(pathOf(calls[0].url), "/v1/company");
  assertEquals(out.name, "Acme Inc.");
  assertEquals(out.users_count, 146);
});

/** A host invokes a no-param read with `{}`; it must not need anything else. */
Deno.test("company-get: takes no parameters", () => {
  assertEquals(companyGet.params, []);
});
