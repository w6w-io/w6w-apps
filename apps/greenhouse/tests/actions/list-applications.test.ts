import { assert, assertEquals, assertThrows } from "@std/assert";
import listApplications from "../../actions/list-applications.ts";
import { applicationStatusOptions } from "../../lib/params.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-applications: calls GET /v3/applications", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listApplications.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/applications");
});

Deno.test("list-applications: maps every parent-id filter to its own vendor name", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listApplications.execute({
    candidateIds: "1,2",
    jobIds: "3",
    jobPostIds: "4",
    sourceIds: "5",
    stageIds: "6",
    jobInterviewStageIds: "7",
    stageName: "Application Review",
    prospect: false,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    candidate_ids: "1,2",
    job_ids: "3",
    job_post_ids: "4",
    source_ids: "5",
    stage_ids: "6",
    job_interview_stage_ids: "7",
    stage_name: "Application Review",
    prospect: "false",
  });
});

/**
 * The filter vocabulary and the response vocabulary differ by exactly one
 * member: you filter for `active`, and the rows come back saying `in_process`.
 * Both halves bite, so both are pinned here.
 */
Deno.test("list-applications: `active` is the filter word, `in_process` is never one", () => {
  const values = applicationStatusOptions.map((o) => o.value);
  assertEquals(values, ["active", "rejected", "hired", "converted"]);
  assert(!values.includes("in_process"), "in_process is a response value, not a filter value");
});

Deno.test("list-applications: the option label warns about the response spelling", () => {
  const active = applicationStatusOptions.find((o) => o.value === "active");
  assert(active?.label.includes("in_process"), active?.label);
});

Deno.test("list-applications: sends the status filter verbatim", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listApplications.execute({ status: "active" }, ctx);
  assertEquals(queryOf(calls[0].url), { status: "active" });
});

/** Greenhouse caps `ids` at 50 per request; failing locally saves a 422. */
Deno.test("list-applications: more than 50 candidate ids fails by name", () => {
  const { ctx } = mockCtx([]);
  const tooMany = Array.from({ length: 51 }, (_, i) => i + 1).join(",");
  const err = assertThrows(() => listApplications.execute({ candidateIds: tooMany }, ctx), Error);
  assert(err.message.includes("candidateIds"), err.message);
});

Deno.test("list-applications: a cursor rejects the filters it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listApplications.execute({ cursor: "NEXT", status: "hired" }, ctx),
    Error,
  );
  assert(err.message.includes("status"), err.message);
});
