import { assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/email-verifier.ts";

Deno.test("email-verifier: a completed 200 reports pending=false, smtpIssue=false", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ status: "valid", score: 100 }) }]);
  const result = await action.execute!({ email: "patrick@stripe.com" }, ctx) as {
    pending: boolean;
    smtpIssue: boolean;
    data: unknown;
  };
  assertEquals(pathOf(calls[0].url), "/v2/email-verifier");
  assertEquals(queryOf(calls[0].url).email, "patrick@stripe.com");
  assertEquals(result.pending, false);
  assertEquals(result.smtpIssue, false);
  assertEquals(result.data, { status: "valid", score: 100 });
});

Deno.test("email-verifier: a 202 reports pending=true instead of throwing", async () => {
  const { ctx } = mockCtx([{ status: 202, body: envelope({ status: null }) }]);
  const result = await action.execute!({ email: "a@b.com" }, ctx) as { pending: boolean };
  assertEquals(result.pending, true);
});

Deno.test("email-verifier: a 222 reports smtpIssue=true instead of throwing", async () => {
  const { ctx } = mockCtx([{ status: 222, body: envelope({ status: "unknown" }) }]);
  const result = await action.execute!({ email: "a@b.com" }, ctx) as {
    pending: boolean;
    smtpIssue: boolean;
  };
  assertEquals(result.pending, false);
  assertEquals(result.smtpIssue, true);
});

Deno.test("email-verifier: a genuine error status still throws", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { errors: [{ id: "invalid_email" }] } }]);
  await assertRejects(
    async () => await action.execute!({ email: "not-an-email" }, ctx),
    Error,
    "invalid_email",
  );
});
