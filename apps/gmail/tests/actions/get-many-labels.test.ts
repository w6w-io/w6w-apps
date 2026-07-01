import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-many-labels.ts";

Deno.test("get-many-labels: GETs users/me/labels and returns the envelope verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { labels: [{ id: "INBOX" }] } }]);
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/labels");
  assertEquals((result as { labels: unknown[] }).labels.length, 1);
});
