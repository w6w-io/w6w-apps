import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-list.ts";

Deno.test("time-entry-list: GETs /time_entries under the connection's businessId", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { time_entries: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/timetracking/business/biz1/time_entries");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("time-entry-list: forwards filters as plain query params, not search[name]", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { time_entries: [] } }]);
  await action.execute({ filters: { started_from: "2026-08-17T00:00:00Z" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("started_from"), "2026-08-17T00:00:00Z");
  assertEquals(url.searchParams.has("search[started_from]"), false);
});
