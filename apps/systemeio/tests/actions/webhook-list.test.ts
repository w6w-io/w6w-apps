import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: fetches /api/webhooks with no query params", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "wh_1" }]) }]);
  await webhookList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/webhooks");
  assertEquals(queryOf(calls[0].url), {});
});
