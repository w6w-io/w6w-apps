import { assert, assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { listBody, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The load-bearing test for this app's biggest leak: `GET /v1/webhooks` returns
 * every webhook's `token` — the shared secret a receiver authenticates Aircall's
 * deliveries with — for up to 100 webhooks in one response.
 */
Deno.test("webhook-list: strips the token from EVERY row", async () => {
  const { ctx } = mockCtx([
    {
      body: listBody("webhooks", [
        { webhook_id: "uuid-1", url: "https://a.example.com", token: "abc123def456ghi789" },
        { webhook_id: "uuid-2", url: "https://b.example.com", token: "4567ghi789abc123def" },
        { webhook_id: "uuid-3", url: "https://c.example.com", token: "zzz999" },
      ]),
    },
  ]);
  const out = await webhookList.execute({}, ctx) as { items: Array<Record<string, unknown>> };

  assertEquals(out.items.length, 3);
  // Asserted over the RAW serialized result, not per-field: a per-row spot check
  // would pass while a token survived in a nested copy.
  const serialized = JSON.stringify(out);
  for (const secret of ["abc123def456ghi789", "4567ghi789abc123def", "zzz999"]) {
    assert(!serialized.includes(secret), `webhook token ${secret} survived into the result`);
  }
  // The rest of the row must survive, or "stripping" is just data loss.
  assertEquals(out.items[0].webhook_id, "uuid-1");
  assertEquals(out.items[2].url, "https://c.example.com");
});

Deno.test("webhook-list: reads GET /v1/webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("webhooks", []) }]);
  await webhookList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
});
