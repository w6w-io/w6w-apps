import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-webhook.ts";

Deno.test("update-webhook: PATCHes /webhooks/{id} with only the provided attributes", async () => {
  const body = { data: { id: "1234567", type: "webhook" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ webhookId: "1234567", paused: false }, ctx);
  assertEquals(calls[0].method, "PATCH");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/webhooks/1234567");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { data: { id: "1234567", type: "webhook", attributes: { paused: false } } });
  assertEquals(out, body);
});

Deno.test("update-webhook: splits a triggers CSV into an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({
    webhookId: "1",
    triggers: "members:create, members:delete",
    uri: "https://y",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.attributes.triggers, ["members:create", "members:delete"]);
  assertEquals(sent.data.attributes.uri, "https://y");
});
