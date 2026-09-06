import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-webhook.ts";

Deno.test("create-webhook: POSTs /webhooks with triggers array and campaign relationship", async () => {
  const body = {
    data: {
      id: "3955",
      type: "webhook",
      attributes: { secret: "abc", uri: "https://example.com/hooks/patreon" },
    },
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute(
    {
      campaignId: "12345",
      uri: "https://example.com/hooks/patreon",
      triggers: "members:create, members:update",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, {
    data: {
      type: "webhook",
      attributes: {
        triggers: ["members:create", "members:update"],
        uri: "https://example.com/hooks/patreon",
      },
      relationships: { campaign: { data: { type: "campaign", id: "12345" } } },
    },
  });
  assertEquals(out, body);
});

Deno.test("create-webhook: rejects an undocumented trigger before making a request", async () => {
  const { ctx, calls } = mockCtx();
  try {
    await action.execute({ campaignId: "1", uri: "https://x", triggers: "members:teleport" }, ctx);
    throw new Error("expected execute() to throw");
  } catch (err) {
    assert(err instanceof Error);
    assert(err.message.includes("members:teleport"));
  }
  assertEquals(calls.length, 0);
});
