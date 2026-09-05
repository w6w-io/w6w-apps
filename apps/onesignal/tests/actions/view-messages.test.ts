import { assertEquals } from "@std/assert";
import viewMessages from "../../actions/view-messages.ts";
import { APP_ID, mockCtxWithConnection, pathOf, queryOf } from "../_helpers.ts";

Deno.test("view-messages: defaults limit/offset, app_id from the connection", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { status: 200, body: { total_count: 0, notifications: [] } },
  ]);
  await viewMessages.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/notifications");
  assertEquals(queryOf(calls[0].url), { app_id: APP_ID, limit: "50", offset: "0" });
});

Deno.test("view-messages: `kind` passes through as-is (creation method, not channel)", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { status: 200, body: { total_count: 0, notifications: [] } },
  ]);
  await viewMessages.execute({ kind: 1 }, ctx);
  assertEquals(queryOf(calls[0].url).kind, "1");
});
