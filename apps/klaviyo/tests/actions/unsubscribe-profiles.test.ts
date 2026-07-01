import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unsubscribe-profiles.ts";

Deno.test("unsubscribe-profiles: POSTs a bulk-delete-job for the selected channels", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { data: { id: "job-x" } } }]);
  await action.execute!(
    { profiles: [{ email: "a@x.com" }], channels: ["email", "sms"] },
    ctx,
  );

  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/profile-subscription-bulk-delete-jobs/",
  );
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.type, "profile-subscription-bulk-delete-job");
  const subs = sent.data.attributes.profiles.data[0].attributes.subscriptions;
  assertEquals(!!subs.email, true);
  assertEquals(!!subs.sms, true);
});
