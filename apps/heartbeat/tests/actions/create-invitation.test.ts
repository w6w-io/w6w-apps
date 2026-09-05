import { assertEquals } from "@std/assert";
import createInvitation from "../../actions/create-invitation.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-invitation: PUT /invitations, returns the created Invitation", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i1", code: "AB12CD" } }]);
  const out = await createInvitation.execute({ roleID: "r1", groupIDs: "g1,g2" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/invitations");
  assertEquals(JSON.parse(calls[0].body!), { roleID: "r1", groupIDs: ["g1", "g2"] });
  assertEquals(out.code, "AB12CD");
});

Deno.test("create-invitation: is not idempotent — each call mints a distinct link", () => {
  assertEquals(createInvitation.idempotent, false);
});
