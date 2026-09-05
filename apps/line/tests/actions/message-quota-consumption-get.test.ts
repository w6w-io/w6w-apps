import { assertEquals } from "@std/assert";
import messageQuotaConsumptionGet from "../../actions/message-quota-consumption-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-quota-consumption-get: GETs /v2/bot/message/quota/consumption", async () => {
  const { ctx, calls } = mockCtx([{ body: { totalUsage: 500 } }]);
  const out = await messageQuotaConsumptionGet.execute({}, ctx) as { totalUsage: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/bot/message/quota/consumption");
  assertEquals(out.totalUsage, 500);
});
