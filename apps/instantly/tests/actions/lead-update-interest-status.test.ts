import { assertEquals } from "@std/assert";
import leadUpdateInterestStatus from "../../actions/lead-update-interest-status.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-update-interest-status: POSTs /leads/update-interest-status", async () => {
  const { ctx, calls } = mockCtx([{ body: { lead_email: "a@b.com" } }]);
  await leadUpdateInterestStatus.execute(
    { lead_email: "a@b.com", interest_value: 1, campaign_id: "c1" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/leads/update-interest-status");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.lead_email, "a@b.com");
  assertEquals(body.interest_value, 1);
});

Deno.test("lead-update-interest-status: a null interest_value resets to plain Lead", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await leadUpdateInterestStatus.execute({ lead_email: "a@b.com", interest_value: null }, ctx);
  assertEquals(JSON.parse(calls[0].body!).interest_value, null);
});

Deno.test("lead-update-interest-status: is declared idempotent", () => {
  assertEquals(leadUpdateInterestStatus.idempotent, true);
});
