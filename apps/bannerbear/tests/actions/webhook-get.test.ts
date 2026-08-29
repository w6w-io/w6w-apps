import { assertEquals } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: GET /webhooks/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "w1", name: "Hook", status: "active" } }]);
  const out = await webhookGet.execute({ uid: "w1" }, ctx) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/webhooks/w1");
  assertEquals(out.status, "active");
});

Deno.test("webhook-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => webhookGet.execute({ uid: "" }, ctx));
});
