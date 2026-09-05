import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-message.ts";

Deno.test("get-message: GETs /messages/{id} and unwraps the data envelope", async () => {
  const data = { id: "msg1", type: "SMS", direction: "outbound" };
  const { ctx, calls } = mockCtx([{ body: { data } }]);

  const result = await action.execute!({ id: "msg1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/messages/msg1");
  assertEquals(result, data);
});

Deno.test("get-message: URL-encodes the message id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ id: "msg/with slash" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/messages/msg%2Fwith%20slash");
});
