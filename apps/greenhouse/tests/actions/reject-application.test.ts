import { assert, assertEquals } from "@std/assert";
import rejectApplication from "../../actions/reject-application.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reject-application: a silent rejection sends only the reason", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await rejectApplication.execute(
    { applicationId: 5, rejectionReasonId: 3 },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/applications/5/reject");
  // No `rejection_email` key at all: omitting it is what makes the rejection
  // silent, and sending an empty object would not.
  assertEquals(bodyOf(calls[0]), { rejection_reason_id: 3 });
  assertEquals(out, { status: 204 });
});

Deno.test("reject-application: notes are recorded alongside the reason", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await rejectApplication.execute(
    { applicationId: 5, rejectionReasonId: 3, notes: "Not enough Rust" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), { rejection_reason_id: 3, notes: "Not enough Rust" });
});

/**
 * The one feature here worth reaching for deliberately: scheduling the e-mail
 * for later is how an automated rejection avoids landing thirty seconds after
 * the interview.
 */
Deno.test("reject-application: an e-mail can be scheduled rather than sent immediately", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await rejectApplication.execute({
    applicationId: 5,
    rejectionReasonId: 3,
    emailTemplateId: 11,
    emailFromUserId: 7,
    sendEmailAt: "2026-08-12T09:00:00Z",
  }, ctx);

  assertEquals(bodyOf(calls[0]).rejection_email, {
    email_template_id: 11,
    email_from_user_id: 7,
    send_email_at: "2026-08-12T09:00:00Z",
  });
});

Deno.test("reject-application: the run log records whether an e-mail will be sent", async () => {
  const { ctx, logs } = mockCtx([{ status: 204 }]);
  await rejectApplication.execute({ applicationId: 5, rejectionReasonId: 3 }, ctx);
  assertEquals(logs[0].data, { applicationId: 5, sendsEmail: false });
});

/** Rejecting an already-rejected application is a 422, not a no-op. */
Deno.test("reject-application: is honestly declared non-idempotent", () => {
  assertEquals(rejectApplication.idempotent, false);
});

Deno.test("reject-application: the reason id is required and points at its lookup", () => {
  const param = (rejectApplication.params ?? []).find((p) => p.key === "rejectionReasonId");
  assertEquals(param?.required, true);
  assert(param?.hint?.includes("List Rejection Reasons"), param?.hint);
});
