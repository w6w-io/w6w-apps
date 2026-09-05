import { assertEquals } from "@std/assert";
import sessionList from "../../actions/session-list.ts";
import type { DevinSession } from "../../lib/client.ts";
import { API_ROOT, mockCtx, queryAllOf, queryOf } from "../_helpers.ts";

function session(overrides: Partial<DevinSession> = {}): DevinSession {
  return {
    session_id: "devin-1",
    status: "running",
    url: "https://app.devin.ai/sessions/devin-1",
    org_id: "org-test0000000000",
    created_at: 1,
    updated_at: 1,
    acus_consumed: 0,
    pull_requests: [],
    tags: [],
    ...overrides,
  };
}

Deno.test("session-list: maps has_next_page/end_cursor onto { items, nextCursor }", async () => {
  const one = session();
  const { ctx } = mockCtx([{
    body: { items: [one], end_cursor: "cursor-2", has_next_page: true, total: 5 },
  }]);
  const out = await sessionList.execute({}, ctx);
  assertEquals(out, { items: [one], nextCursor: "cursor-2" });
});

Deno.test("session-list: nextCursor is absent on the last page even if end_cursor is set", async () => {
  const { ctx } = mockCtx([{
    body: { items: [], end_cursor: "stale", has_next_page: false, total: 0 },
  }]);
  const out = await sessionList.execute({}, ctx);
  assertEquals(out.nextCursor, undefined);
});

Deno.test("session-list: sends cursor/limit as after/first", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await sessionList.execute({ cursor: "abc", limit: 50 }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/sessions?after=abc&first=50`);
});

Deno.test("session-list: array filters (tags, sessionIds, origins) are sent as repeated query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await sessionList.execute({ tags: ["a", "b"], sessionIds: "devin-1,devin-2" }, ctx);
  assertEquals(queryAllOf(calls[0].url, "tags"), ["a", "b"]);
  assertEquals(queryAllOf(calls[0].url, "session_ids"), ["devin-1", "devin-2"]);
});

Deno.test("session-list: omits unset filters entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await sessionList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].url, `${API_ROOT}/sessions`);
});

Deno.test("session-list: is a search action", () => {
  assertEquals(sessionList.type, "search");
});
