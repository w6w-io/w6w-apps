import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/carrier-get.ts";

Deno.test("carrier-get: fetches by carrierId", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { carrier_id: "se-1", carrier_code: "stamps_com", services: [{ service_code: "x" }] },
    },
  ]);
  const result = await action.execute!({ carrierId: "se-1" }, ctx) as {
    carrierId: string;
    services: unknown[];
  };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/carriers/se-1");
  assertEquals(result.carrierId, "se-1");
  assertEquals(result.services.length, 1);
});

Deno.test("carrier-get: requires carrierId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "carrierId");
  assertEquals(calls.length, 0);
});
