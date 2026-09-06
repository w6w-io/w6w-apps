import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-webhooks.ts";

Deno.test("list-webhooks: GETs /webhooks", async () => {
  const body = { data: [{ id: "2793", type: "webhook" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ webhookFields: "uri,triggers,paused" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/webhooks");
  assertEquals(url.searchParams.get("fields[webhook]"), "uri,triggers,paused");
  assertEquals(out, body);
});
