import { assertEquals, assertRejects } from "@std/assert";
import markLeadAsReplied from "../../actions/mark-lead-as-replied.ts";
import { mockCtx, pathOf, yelpError } from "../_helpers.ts";

Deno.test("mark-lead-as-replied: POSTs the reply_type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await markLeadAsReplied.execute({ leadId: "abc", replyType: "PHONE" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/leads/abc/mark_as_replied");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { reply_type: "PHONE" });
});

Deno.test("mark-lead-as-replied: a repeat call surfaces Yelp's own already-replied error", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: yelpError("NOT_AUTHORIZED", "Lead already marked as replied") },
  ]);
  await assertRejects(
    async () => await markLeadAsReplied.execute({ leadId: "abc", replyType: "EMAIL" }, ctx),
    Error,
    "Lead already marked as replied",
  );
});

Deno.test("mark-lead-as-replied: is declared not idempotent", () => {
  assertEquals(markLeadAsReplied.idempotent, false);
});
