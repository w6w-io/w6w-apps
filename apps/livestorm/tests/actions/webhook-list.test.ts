import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

Deno.test("webhook-list: GETs /webhooks with an event filter", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("webhooks", "w1")]) }]);
  await webhookList.execute({ event: "session.started" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(queryOf(calls[0].url), { "filter[event]": "session.started" });
});
