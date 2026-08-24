import { assertEquals } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-update: merge-patches /api/webhooks/{id}, never sends url", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh_1", active: false } }]);
  await webhookUpdate.execute({ id: "wh_1", active: false }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/webhooks/wh_1");
  assertEquals(calls[0].headers["content-type"], "application/merge-patch+json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { active: false });
  assertEquals("url" in body, false);
});
