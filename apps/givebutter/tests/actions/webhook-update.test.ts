import { assert, assertEquals } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-update: PUTs url and events to /webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "wh_1" }) }]);
  await webhookUpdate.execute(
    { id: "wh_1", url: "https://example.com/hook2", events: ["plan.created"] },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/wh_1");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com/hook2",
    events: ["plan.created"],
  });
});

/** Update documents BOTH url and events required, unlike create's url-only requirement. */
Deno.test("webhook-update: throws before making a request when events is empty", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await webhookUpdate.execute({ id: "wh_1", url: "https://example.com", events: [] }, ctx);
  } catch (e) {
    threw = true;
    assert(String(e).includes("events"));
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
