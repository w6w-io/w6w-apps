import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-trigger-send.ts";

Deno.test("campaign-trigger-send: posts campaign_id, audience and recipients", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { dispatch_id: "d1" } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({
    campaignId: "camp1",
    audience: { AND: [] },
    recipients: [{ external_user_id: "u1" }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.campaign_id, "camp1");
  assertEquals(body.audience, { AND: [] });
  assertEquals(body.recipients, [{ external_user_id: "u1" }]);
});

Deno.test("campaign-trigger-send: defaults send_id to the invocation id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], {
    display: { instance: "iad-01" },
    invocationId: "inv-123",
  });
  await action.execute!({ campaignId: "camp1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.send_id, "inv-123");
});

Deno.test("campaign-trigger-send: an explicit send_id wins over the invocation id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], {
    display: { instance: "iad-01" },
    invocationId: "inv-123",
  });
  await action.execute!({ campaignId: "camp1", sendId: "manual-send" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.send_id, "manual-send");
});
