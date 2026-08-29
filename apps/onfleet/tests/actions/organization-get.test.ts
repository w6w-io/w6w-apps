import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-get.ts";

Deno.test("organization-get: fetches the own-organization endpoint with no params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "org_1", name: "Acme" } }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/organization");
  assertEquals(calls[0].method, "GET");
  assertEquals((result as { name: string }).name, "Acme");
});

Deno.test("organization-get: takes no params", () => {
  assertEquals(action.params, []);
});
