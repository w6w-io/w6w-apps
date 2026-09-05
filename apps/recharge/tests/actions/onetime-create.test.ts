import { assertEquals } from "@std/assert";
import onetimeCreate from "../../actions/onetime-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("onetime-create: POSTs to /onetimes with a nested external_variant_id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope("onetime", { id: 1 }) }]);
  await onetimeCreate.execute(
    {
      addressId: 48563471,
      externalVariantId: "32165284380775",
      quantity: 1,
      addToNextCharge: true,
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/onetimes");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.external_variant_id, { ecommerce: "32165284380775" });
  assertEquals(body.add_to_next_charge, true);
  assertEquals("next_charge_scheduled_at" in body, false);
});
