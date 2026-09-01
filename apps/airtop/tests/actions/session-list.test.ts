import { assertEquals } from "@std/assert";
import sessionList from "../../actions/session-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("session-list: passes through filters and pagination", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ sessions: [{ id: "s1" }], pagination: { totalItems: 1 } }),
  }]);
  const out = await sessionList.execute(
    { sessionIds: "s1, s2", status: "running", limit: 5, offset: 0 },
    ctx,
  ) as { sessions: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions");
  assertEquals(queryOf(calls[0].url), {
    sessionIds: "s1,s2",
    status: "running",
    limit: "5",
    offset: "0",
  });
  assertEquals(out.sessions.length, 1);
});

Deno.test("session-list: omits filters that were left empty", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ sessions: [], pagination: {} }) }]);
  await sessionList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
