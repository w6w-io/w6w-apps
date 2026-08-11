import { assert, assertEquals, assertThrows } from "@std/assert";
import listInterviews from "../../actions/list-interviews.ts";
import { interviewStatusOptions } from "../../lib/params.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-interviews: calls GET /v3/interviews", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listInterviews.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/interviews");
});

Deno.test("list-interviews: carries all nine documented status values", () => {
  assertEquals(interviewStatusOptions.length, 9);
  assert(interviewStatusOptions.some((o) => o.value === "to_be_scheduled"));
  assert(interviewStatusOptions.some((o) => o.value === "awaiting_feedback"));
});

Deno.test("list-interviews: maps its parent filters and the timed-start filter", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listInterviews.execute({
    applicationIds: "1",
    jobIds: "2",
    organizerIds: "3",
    status: "scheduled",
    externalEventId: "cal-1",
    startsAtOperator: "gte",
    startsAt: "2026-08-12T00:00:00Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    application_ids: "1",
    job_ids: "2",
    organizer_ids: "3",
    status: "scheduled",
    external_event_id: "cal-1",
    starts_at: "gte|2026-08-12T00:00:00Z",
  });
});

/**
 * An all-day interview carries `all_day_start_on` and no `starts_at`, so a
 * `starts_at` filter silently excludes it. That is a digest that looks right and
 * is wrong, so the hint has to say it out loud.
 */
Deno.test("list-interviews: the starts-at hint warns that all-day interviews are excluded", () => {
  const param = (listInterviews.params ?? []).find((p) => p.key === "startsAtOperator");
  assert(param?.hint?.includes("All-day"), param?.hint);
});

Deno.test("list-interviews: a cursor rejects the status it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listInterviews.execute({ cursor: "N", status: "complete" }, ctx),
    Error,
  );
  assert(err.message.includes("status"), err.message);
});
