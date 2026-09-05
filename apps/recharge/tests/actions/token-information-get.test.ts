import { assertEquals } from "@std/assert";
import tokenInformationGet from "../../actions/token-information-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("token-information-get: hits GET /token_information and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope("token_information", {
        name: "my token",
        contact_email: "ops@store.example",
        scopes: ["read_customers", "write_subscriptions"],
      }),
    },
  ]);
  const out = await tokenInformationGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/token_information");
  assertEquals(out, {
    name: "my token",
    contact_email: "ops@store.example",
    scopes: ["read_customers", "write_subscriptions"],
  });
});

Deno.test("token-information-get: takes no parameters and requires no scope", () => {
  assertEquals(tokenInformationGet.params?.length, 0);
});
