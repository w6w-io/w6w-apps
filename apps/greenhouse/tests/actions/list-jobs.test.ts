import { assert, assertEquals, assertThrows } from "@std/assert";
import listJobs from "../../actions/list-jobs.ts";
import { jobStatusOptions } from "../../lib/params.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-jobs: calls GET /v3/jobs", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listJobs.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/jobs");
});

/**
 * Unlike applications, the job status filter and the job status response share
 * one vocabulary — which is worth asserting so the difference stays visible.
 */
Deno.test("list-jobs: the status vocabulary is the documented three", () => {
  assertEquals(jobStatusOptions.map((o) => o.value), ["open", "draft", "closed"]);
});

/**
 * `department_id` and `office_id` are scalar in this API while nearly every
 * other parent filter is a comma-separated list. Sending a list here is a 422.
 */
Deno.test("list-jobs: department and office are scalar filters, not lists", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listJobs.execute({
    status: "open",
    departmentId: 4,
    officeId: 9,
    requisitionId: "ENG-1",
    confidential: false,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    status: "open",
    department_id: "4",
    office_id: "9",
    requisition_id: "ENG-1",
    confidential: "false",
  });
});

Deno.test("list-jobs: opened_at uses the pipe-delimited operator form", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listJobs.execute({ openedAtOperator: "gte", openedAt: "2026-01-01T00:00:00Z" }, ctx);
  assertEquals(queryOf(calls[0].url), { opened_at: "gte|2026-01-01T00:00:00Z" });
});

Deno.test("list-jobs: a cursor rejects the status it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(() => listJobs.execute({ cursor: "N", status: "open" }, ctx), Error);
  assert(err.message.includes("status"), err.message);
});
