import { assert, assertEquals, assertRejects } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-update: PUTs only what was set, and strips the token from the answer", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "42", enabled: true, token: "s3cret" },
  }]);
  const webhook = await webhookUpdate.execute({ webhookId: "42", enabled: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/webhooks/42");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { enabled: true });
  assert(!JSON.stringify(webhook).includes("s3cret"), "the signing token came back");
});

Deno.test("webhook-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await webhookUpdate.execute({ webhookId: "42" }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-update: says scopes are replaced and that it revives a disabled webhook", () => {
  const scopes = webhookUpdate.params!.find((p) => p.key === "scopes")!;
  assert(/REPLACES/.test(scopes.hint!), scopes.hint);
  const enabled = webhookUpdate.params!.find((p) => p.key === "enabled")!;
  assert(/25 delivery failures/.test(enabled.hint!), enabled.hint);
});
