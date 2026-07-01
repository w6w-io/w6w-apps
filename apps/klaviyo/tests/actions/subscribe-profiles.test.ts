import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscribe-profiles.ts";

Deno.test("subscribe-profiles: POSTs a bulk-create-job with list relationship and consent", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { data: { id: "job-1" } } }]);
  await action.execute!(
    {
      listId: "L1",
      customSource: "marketing site",
      profiles: [{ email: "a@x.com", emailConsent: "SUBSCRIBED" }],
    },
    ctx,
  );

  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/profile-subscription-bulk-create-jobs/",
  );
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.type, "profile-subscription-bulk-create-job");
  assertEquals(sent.data.relationships.list.data.id, "L1");
  assertEquals(sent.data.attributes.custom_source, "marketing site");
  assertEquals(sent.data.attributes.profiles.data[0].attributes.email, "a@x.com");
  assertEquals(
    sent.data.attributes.profiles.data[0].attributes.subscriptions.email.marketing.consent,
    "SUBSCRIBED",
  );
});
