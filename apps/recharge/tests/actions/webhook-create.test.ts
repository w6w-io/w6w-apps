import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POSTs the address and topic to /webhooks", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 201,
      body: envelope("webhook", {
        id: 19451,
        address: "https://request.in/foo",
        topic: "subscription/created",
      }),
    },
  ]);
  const out = await webhookCreate.execute(
    { address: "https://request.in/foo", topic: "subscription/created" },
    ctx,
  ) as { id: number };
  assertEquals(pathOf(calls[0].url), "/webhooks");
  assertEquals(
    JSON.parse(calls[0].body!),
    { address: "https://request.in/foo", topic: "subscription/created" },
  );
  assertEquals(out.id, 19451);
});

Deno.test("webhook-create: is not marked idempotent, since a repeat call registers a second webhook", () => {
  assertEquals(webhookCreate.idempotent, false);
});
