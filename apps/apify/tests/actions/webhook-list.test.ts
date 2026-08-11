import { assert, assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: calls GET /v2/webhooks and unwraps the page", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "w1" }]) }]);
  const out = await webhookList.execute({ limit: 100, desc: true }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/webhooks");
  assertEquals(queryOf(calls[0].url), { limit: "100", desc: "1" });
  assertEquals(out.items, [{ id: "w1" }]);
});

/**
 * `headersTemplate` is arbitrary user text whose documented purpose is to carry
 * auth headers to the receiving service, so it is NOT stripped — unlike
 * `proxy.password` and `urlSigningSecretKey`, it is not an Apify-issued value at
 * a known path, and removing it would break read-modify-write of a webhook. The
 * risk is stated in the action's description instead.
 */
Deno.test("webhook-list: warns in its description that results can carry secrets", () => {
  assert(/secret/i.test(webhookList.description ?? ""), webhookList.description);
});
