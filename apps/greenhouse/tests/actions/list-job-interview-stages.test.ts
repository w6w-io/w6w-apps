import { assert, assertEquals, assertThrows } from "@std/assert";
import listJobInterviewStages from "../../actions/list-job-interview-stages.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-job-interview-stages: calls GET /v3/job_interview_stages", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listJobInterviewStages.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/job_interview_stages");
});

Deno.test("list-job-interview-stages: maps the job and active filters", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listJobInterviewStages.execute({ jobIds: "1,2", active: true }, ctx);
  assertEquals(queryOf(calls[0].url), { job_ids: "1,2", active: "true" });
});

/**
 * Retired stages remain on old applications, so filtering to active ones while
 * reading history quietly drops rows.
 */
Deno.test("list-job-interview-stages: the active hint warns about reading history", () => {
  const param = (listJobInterviewStages.params ?? []).find((p) => p.key === "active");
  assert(param?.hint?.includes("history"), param?.hint);
});

Deno.test("list-job-interview-stages: a cursor rejects the job filter it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listJobInterviewStages.execute({ cursor: "N", jobIds: "1" }, ctx),
    Error,
  );
  assert(err.message.includes("job_ids"), err.message);
});
