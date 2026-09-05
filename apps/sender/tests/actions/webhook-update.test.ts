import { assertEquals } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-update: POSTs (not PATCH) to /v2/account/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        id: "w1",
        url: "https://hooks.zapier.com/x",
        topic: "campaigns/new",
        status: "PAUSED",
      },
    },
  ]);
  await webhookUpdate.execute({ id: "w1", status: "PAUSED" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/account/webhooks/w1");
  assertEquals(JSON.parse(calls[0].body!), { status: "PAUSED" });
});
