import { assert, assertEquals, assertThrows } from "@std/assert";
import createApplication from "../../actions/create-application.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/** The candidate-application arm: `candidate_id` + `job_id`. */
Deno.test("create-application: the candidate arm sends candidate_id and job_id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 5, status: "in_process" } }]);
  await createApplication.execute({ candidateId: 1, jobId: 2, sourceId: 3 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/applications");
  assertEquals(bodyOf(calls[0]), { candidate_id: 1, job_id: 2, source_id: 3 });
});

Deno.test("create-application: an initial stage is only meaningful on the candidate arm", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await createApplication.execute({ candidateId: 1, jobId: 2, initialStageId: 8 }, ctx);
  assertEquals(bodyOf(calls[0]), { candidate_id: 1, job_id: 2, initial_stage_id: 8 });
});

/**
 * The prospect arm: `prospect: true` plus an optional PLURAL job list. A prospect
 * with no job at all is valid, which is why `job_ids` is not required here.
 */
Deno.test("create-application: the prospect arm sends prospect and a plural job list", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await createApplication.execute({
    candidateId: 1,
    prospect: true,
    prospectiveJobIds: "7,8",
  }, ctx);

  assertEquals(bodyOf(calls[0]), { candidate_id: 1, prospect: true, job_ids: [7, 8] });
});

Deno.test("create-application: a jobless prospect is valid", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await createApplication.execute({ candidateId: 1, prospect: true }, ctx);
  assertEquals(bodyOf(calls[0]), { candidate_id: 1, prospect: true });
});

/**
 * Picking the wrong arm of the vendor's `oneOf` is a 422. Failing locally names
 * both shapes so the fix is obvious.
 */
Deno.test("create-application: a non-prospect without a job id fails locally", () => {
  const { ctx, calls } = mockCtx([]);
  const err = assertThrows(() => createApplication.execute({ candidateId: 1 }, ctx), Error);
  assert(err.message.includes("prospect: true"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("create-application: the two arms are surfaced with showIf rather than prose alone", () => {
  const byKey = Object.fromEntries((createApplication.params ?? []).map((p) => [p.key, p]));
  assert(byKey.jobId.showIf !== undefined);
  assert(byKey.prospectiveJobIds.showIf !== undefined);
});

Deno.test("create-application: is honestly declared non-idempotent", () => {
  assertEquals(createApplication.idempotent, false);
});
