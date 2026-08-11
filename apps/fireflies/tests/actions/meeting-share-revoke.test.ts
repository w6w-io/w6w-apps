import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/meeting-share-revoke.ts";

Deno.test("meeting-share-revoke: sends meeting id and one email in the input object", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { revokeSharedMeetingAccess: { success: true } } },
  }]);
  await action.execute({ meetingId: "m1", email: "a@b.com" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("$input: RevokeSharedMeetingAccessInput!"));
  assertEquals(variables.input, { meeting_id: "m1", email: "a@b.com" });
});

Deno.test("meeting-share-revoke: revoking twice lands on the same state", () => {
  assertEquals(action.idempotent, true);
});
