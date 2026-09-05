import { assertEquals } from "@std/assert";
import createOrUpdateContact from "../../actions/create-or-update-contact.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-or-update-contact: POSTs to /contacts with the identifiers array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1" } }]);
  const identifiers = [{
    type: "email",
    id: "a@b.com",
    channels: { email: { status: "subscribed" } },
  }];
  await createOrUpdateContact.execute({ identifiers }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contacts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.identifiers, identifiers);
});

/**
 * 201 (created) and 200 (updated an existing contact by email) are the only
 * two documented success statuses, with the identical body shape either way —
 * the action must not special-case one of them.
 */
Deno.test("create-or-update-contact: 200 (updated existing) and 201 (created) both resolve", async () => {
  const identifiers = [{ type: "email", id: "a@b.com" }];
  {
    const { ctx } = mockCtx([{ status: 201, body: { id: "c1", email: "a@b.com" } }]);
    const out = await createOrUpdateContact.execute({ identifiers }, ctx) as { id: string };
    assertEquals(out.id, "c1");
  }
  {
    const { ctx } = mockCtx([{ status: 200, body: { id: "c1", email: "a@b.com" } }]);
    const out = await createOrUpdateContact.execute({ identifiers }, ctx) as { id: string };
    assertEquals(out.id, "c1");
  }
});

Deno.test("create-or-update-contact: optional fields absent from input are omitted, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await createOrUpdateContact.execute({ identifiers: [{ type: "email", id: "a@b.com" }] }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals("firstName" in body, false);
  assertEquals("customProperties" in body, false);
});

Deno.test("create-or-update-contact: is marked idempotent — upsert by email is safe to retry", () => {
  assertEquals(createOrUpdateContact.idempotent, true);
  assertEquals(createOrUpdateContact.type, "perform");
});
