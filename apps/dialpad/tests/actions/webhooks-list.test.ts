import { assertEquals } from "@std/assert";
import webhooksList from "../../actions/webhooks-list.ts";
import { mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("webhooks-list: GETs /webhooks and strips the signing secret from every item", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: page([{ id: "1", hook_url: "https://x", signature: { algo: "HS256", secret: "s" } }]),
  }]);
  const out = await webhooksList.execute({}, ctx) as {
    items: Array<{ signature: { secret?: string } }>;
  };
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks");
  assertEquals(out.items[0].signature.secret, undefined);
});
