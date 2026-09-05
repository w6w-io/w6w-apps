import { assertEquals } from "@std/assert";
import updateInvitation from "../../actions/update-invitation.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-invitation: POST /invitations/{id} with emails and shouldSendEmail", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateInvitation.execute(
    { invitationID: "i1", emails: "a@b.com,c@d.com", shouldSendEmail: true },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v0/invitations/i1");
  assertEquals(JSON.parse(calls[0].body!), {
    emails: ["a@b.com", "c@d.com"],
    shouldSendEmail: true,
  });
});

Deno.test("update-invitation: is not idempotent — shouldSendEmail can re-send on retry", () => {
  assertEquals(updateInvitation.idempotent, false);
});
