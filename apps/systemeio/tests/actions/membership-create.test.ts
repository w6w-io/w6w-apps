import { assertEquals } from "@std/assert";
import membershipCreate from "../../actions/membership-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The vendor answers 202 Accepted with no body schema at all for this
 * endpoint — this action must report the status rather than assume a
 * Membership object comes back synchronously.
 */
Deno.test("membership-create: POSTs {contactId}, reports the 202 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  const out = await membershipCreate.execute({ communityId: 9, contactId: 42 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/community/communities/9/memberships");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { contactId: 42 });
  assertEquals(out, { status: 202 });
});
