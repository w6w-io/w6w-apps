import { assert, assertEquals, assertThrows } from "@std/assert";
import listApplicationStages from "../../actions/list-application-stages.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-application-stages: calls GET /v3/application_stages", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listApplicationStages.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/application_stages");
});

Deno.test("list-application-stages: maps the application and stage-definition filters", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listApplicationStages.execute({
    applicationIds: "1,2",
    jobInterviewStageIds: "9",
    current: true,
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    application_ids: "1,2",
    job_interview_stage_ids: "9",
    current: "true",
  });
});

/**
 * This is the lookup `move-application` depends on: `from_stage_id` must be the
 * stage the application occupies right now, and `current` is how you get it.
 */
Deno.test("list-application-stages: the current filter is documented as the move lookup", () => {
  const param = (listApplicationStages.params ?? []).find((p) => p.key === "current");
  assert(param?.hint?.includes("sitting in now"), param?.hint);
});

Deno.test("list-application-stages: a cursor rejects the current filter it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listApplicationStages.execute({ cursor: "N", current: true }, ctx),
    Error,
  );
  assert(err.message.includes("current"), err.message);
});
