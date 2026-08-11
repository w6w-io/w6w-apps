import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/analytics-get.ts";

const OK = { data: { analytics: { team: {} } } };

Deno.test("analytics-get: start/end are String here, not the DateTime the transcripts query uses", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ startTime: "2026-01-01T00:00:00Z", endTime: "2026-01-31T23:59:59Z" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("query Analytics($startTime: String, $endTime: String)"));
  assert(query.includes("analytics(start_time: $startTime, end_time: $endTime)"));
  assertEquals(variables, {
    startTime: "2026-01-01T00:00:00Z",
    endTime: "2026-01-31T23:59:59Z",
  });
});

Deno.test("analytics-get: the per-user breakdown is opt-in", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }, { body: OK }]);
  await action.execute({}, ctx);
  assert(!sent(calls[0]).query.includes("users {"));
  await action.execute({ includeUsers: true }, ctx);
  assert(sent(calls[1]).query.includes("users {"));
});
