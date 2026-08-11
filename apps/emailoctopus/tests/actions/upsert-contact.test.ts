import { assert, assertEquals } from "@std/assert";
import action from "../../actions/upsert-contact.ts";
import createContact from "../../actions/create-contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("upsert-contact: PUTs the collection path, not a per-contact path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute!({ listId: "l1", emailAddress: "otto@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/contacts");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "otto@example.com" });
});

Deno.test("upsert-contact: sends tags as an OBJECT of tag -> boolean", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    listId: "l1",
    emailAddress: "otto@example.com",
    tags: { vip: true, "old-tag": false },
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(!Array.isArray(sent.tags), "PUT takes an object, not the array POST takes");
  assertEquals(sent.tags, { vip: true, "old-tag": false });
});

Deno.test("upsert-contact and create-contact disagree about the type of `tags`", () => {
  // Guard on the divergence itself: same field name, same resource, two JSON
  // types depending on the verb. Sending the wrong one is a 422.
  const upsertHint = action.params!.find((p) => p.key === "tags")!.hint!;
  const createHint = createContact.params!.find((p) => p.key === "tags")!.hint!;
  assert(/object/i.test(upsertHint), "the upsert hint must say OBJECT");
  assert(/array/i.test(createHint), "the create hint must say array");
  assertEquals(action.idempotent, true);
  assertEquals(createContact.idempotent, false);
});

Deno.test("upsert-contact: omits attributes the caller did not set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ listId: "l1", emailAddress: "otto@example.com", status: "pending" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), ["email_address", "status"]);
});
