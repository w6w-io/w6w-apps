import { assertEquals } from "@std/assert";
import mandateCreate from "../../actions/mandate-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mandate-create: posts method/consumerName/consumerAccount to /customers/{id}/mandates", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "mdt_1", status: "valid" } }]);
  const out = await mandateCreate.execute(
    {
      customerId: "cst_1",
      method: "directdebit",
      consumerName: "Ada Lovelace",
      consumerAccount: "NL55INGB0000000000",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/mandates");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    method: "directdebit",
    consumerName: "Ada Lovelace",
    consumerAccount: "NL55INGB0000000000",
  });
  assertEquals(out, { id: "mdt_1", status: "valid" });
});

Deno.test("mandate-create: is not idempotent", () => {
  assertEquals(mandateCreate.idempotent, false);
});
