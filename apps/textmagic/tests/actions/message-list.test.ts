import { assertEquals } from "@std/assert";
import messageList from "../../actions/message-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("message-list: GETs /messages with pagination query params", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1 }]) }]);
  const out = await messageList.execute({ page: 2, limit: 25 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/messages");
  assertEquals(queryOf(calls[0].url), { page: "2", limit: "25" });
  assertEquals(out, page([{ id: 1 }]));
});

Deno.test("message-list: omits unset query params rather than sending empty values", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await messageList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("message-list: lastId overrides page as documented", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await messageList.execute({ page: 3, lastId: 500 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "3", lastId: "500" });
});
