import { assertEquals } from "@std/assert";
import messageQuotaGet from "../../actions/message-quota-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-quota-get: GETs /v2/bot/message/quota", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "limited", value: 1000 } }]);
  const out = await messageQuotaGet.execute({}, ctx) as { type: string; value: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/bot/message/quota");
  assertEquals(out, { type: "limited", value: 1000 });
});

Deno.test("message-quota-get: an unmetered account reports type none with no value", async () => {
  const { ctx } = mockCtx([{ body: { type: "none" } }]);
  const out = await messageQuotaGet.execute({}, ctx) as { type: string; value?: number };
  assertEquals(out.type, "none");
  assertEquals(out.value, undefined);
});
