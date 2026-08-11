import { assert, assertEquals, assertThrows } from "@std/assert";
import listScorecards from "../../actions/list-scorecards.ts";
import { scorecardStatusOptions } from "../../lib/params.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-scorecards: calls GET /v3/scorecards", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listScorecards.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/scorecards");
});

Deno.test("list-scorecards: status is draft or complete", () => {
  assertEquals(scorecardStatusOptions.map((o) => o.value), ["draft", "complete"]);
});

/**
 * Interviewer and submitter are different people on the same row — a coordinator
 * can file feedback on someone's behalf — so both are offered rather than one
 * "who" field that answers the wrong question half the time.
 */
Deno.test("list-scorecards: interviewer and submitter are separate filters", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listScorecards.execute({
    applicationIds: "1",
    interviewerIds: "2",
    submitterIds: "3",
    interviewKitIds: "4",
    status: "complete",
    submittedAtOperator: "gte",
    submittedAt: "2026-08-01T00:00:00Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    application_ids: "1",
    interviewer_ids: "2",
    submitter_ids: "3",
    interview_kit_ids: "4",
    status: "complete",
    submitted_at: "gte|2026-08-01T00:00:00Z",
  });
});

Deno.test("list-scorecards: the status hint warns that drafts are included by default", () => {
  const param = (listScorecards.params ?? []).find((p) => p.key === "status");
  assert(param?.hint?.includes("drafts"), param?.hint);
});

Deno.test("list-scorecards: a cursor rejects the application filter it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listScorecards.execute({ cursor: "N", applicationIds: "1" }, ctx),
    Error,
  );
  assert(err.message.includes("application_ids"), err.message);
});
