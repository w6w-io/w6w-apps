import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POST /webhooks", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uid: "w1", name: "Hook" } }]);
  await webhookCreate.execute(
    { name: "Hook", url: "https://example.com/hooks/bb", resource: "image", event: "completed" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Hook",
    url: "https://example.com/hooks/bb",
    resource: "image",
    event: "completed",
  });
});

Deno.test("webhook-create: requires name and url", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => webhookCreate.execute({ name: "", url: "https://x" }, ctx));
  await assertRejects(() => webhookCreate.execute({ name: "Hook", url: "" }, ctx));
});

Deno.test("webhook-create: not idempotent", () => {
  assertEquals(webhookCreate.idempotent, false);
});
