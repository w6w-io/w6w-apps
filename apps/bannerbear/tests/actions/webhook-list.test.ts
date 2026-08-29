import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: GET /webhooks with the page query param", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "w1" }] }]);
  const out = await webhookList.execute({ page: 1 }, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/webhooks");
  assertEquals(queryOf(calls[0].url), { page: "1" });
  assertEquals(out, [{ uid: "w1" }]);
});
