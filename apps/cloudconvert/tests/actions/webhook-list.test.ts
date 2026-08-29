import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: GETs /v2/users/me/webhooks with filter[url] and pagination", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ id: 1, url: "https://example.com/hook" }], "/v2/webhooks"),
  }]);
  await webhookList.execute({ filterUrl: "https://example.com/hook", perPage: 25 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/users/me/webhooks");
  assertEquals(queryOf(calls[0].url), {
    "filter[url]": "https://example.com/hook",
    per_page: "25",
  });
});
