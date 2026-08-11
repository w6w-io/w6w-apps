import { assert, assertEquals, assertRejects } from "@std/assert";
import moveApplication from "../../actions/move-application.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("move-application: POSTs the guard and the destination, and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await moveApplication.execute(
    { applicationId: 5, fromStageId: 1, toStageId: 2 },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/applications/5/move");
  assertEquals(bodyOf(calls[0]), { from_stage_id: 1, to_stage_id: 2 });
  // 204 with no body: there is no moved application to inspect.
  assertEquals(out, { status: 204 });
});

Deno.test("move-application: a transfer sends to_job_id instead of to_stage_id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await moveApplication.execute(
    { applicationId: 5, fromStageId: 1, toJobId: 99, emailFromUserId: 7 },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), { from_stage_id: 1, to_job_id: 99, email_from_user_id: 7 });
});

/**
 * Two destinations is the mistake that puts a candidate on the wrong job, so it
 * is refused here rather than left to the server's interpretation.
 */
Deno.test("move-application: both destinations at once is refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        moveApplication.execute(
          { applicationId: 5, fromStageId: 1, toStageId: 2, toJobId: 9 },
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("Choose one destination"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("move-application: no destination at all is refused locally", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(moveApplication.execute({ applicationId: 5, fromStageId: 1 }, ctx)),
    Error,
    "destination is required",
  );
});

/**
 * `from_stage_id` is a compare-and-swap guard: after a successful move the
 * application is no longer in it, so a retry fails validation. Marking this
 * idempotent would turn one dropped connection into a confusing 422.
 */
Deno.test("move-application: is non-idempotent, and the guard field says why", () => {
  assertEquals(moveApplication.idempotent, false);
  const guard = (moveApplication.params ?? []).find((p) => p.key === "fromStageId");
  assertEquals(guard?.required, true);
  assert(guard?.hint?.includes("RIGHT NOW"), guard?.hint);
});

/** A move fires stage-transition rules, which can e-mail the candidate. */
Deno.test("move-application: the e-mail side effect is stated on the sender field", () => {
  const param = (moveApplication.params ?? []).find((p) => p.key === "emailFromUserId");
  assert(param?.hint?.includes("stage-transition rules"), param?.hint);
});
