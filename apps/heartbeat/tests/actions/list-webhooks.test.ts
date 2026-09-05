import { assertEquals } from "@std/assert";
import listWebhooks from "../../actions/list-webhooks.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-webhooks: GET /webhooks, wrapped under `webhooks`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "w1", url: "https://example.com/hook" }] }]);
  const out = await listWebhooks.execute({}, ctx) as { webhooks: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/webhooks");
  assertEquals(out.webhooks.length, 1);
});
