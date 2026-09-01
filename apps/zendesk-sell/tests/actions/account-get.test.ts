import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: fetches /v2/accounts/self and takes no params", async () => {
  const { ctx, calls } = mockCtx([
    { body: dataEnvelope({ id: 1, name: "Sales Co", currency: "USD" }) },
  ]);
  const out = await accountGet.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/accounts/self");
  assertEquals(out.name, "Sales Co");
  assertEquals(accountGet.params?.length, 0);
});
