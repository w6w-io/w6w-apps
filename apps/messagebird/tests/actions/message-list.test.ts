import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/message-list.ts";

Deno.test("message-list: GETs /messages with no query params when unfiltered", async () => {
  const body = { offset: 0, limit: 20, count: 0, totalCount: 0, items: [] };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await action.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/messages");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(result, body);
});

Deno.test("message-list: passes the documented filters through as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      originator: "YourName",
      recipient: "31612345678",
      direction: "mt",
      type: "sms",
      status: "delivered",
      searchterm: "hello",
      limit: 10,
      offset: 5,
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    originator: "YourName",
    recipient: "31612345678",
    direction: "mt",
    type: "sms",
    status: "delivered",
    searchterm: "hello",
    limit: "10",
    offset: "5",
  });
});
