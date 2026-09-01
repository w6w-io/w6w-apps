import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-create.ts";

Deno.test("time-entry-create: POSTs /time_entries with the duration/started_at/is_logged envelope", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { time_entry: { id: 1 } } }]);
  await action.execute({ duration: 7200, startedAt: "2026-08-16T20:00:00.000Z" }, ctx);
  assertEquals(calls[0].url, "https://api.freshbooks.com/timetracking/business/biz1/time_entries");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    time_entry: { duration: 7200, started_at: "2026-08-16T20:00:00.000Z", is_logged: true },
  });
});

Deno.test("time-entry-create: honors isLogged: false and merges optional fields", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: {} }]);
  await action.execute({
    duration: 0,
    startedAt: "2026-08-16T20:00:00.000Z",
    isLogged: false,
    clientId: "2149780",
    projectId: "153125",
    additionalFields: { identity_id: "8804571" },
  }, ctx);
  const body = JSON.parse(calls[0].body!).time_entry;
  assertEquals(body.is_logged, false);
  assertEquals(body.client_id, "2149780");
  assertEquals(body.project_id, "153125");
  assertEquals(body.identity_id, "8804571");
});
