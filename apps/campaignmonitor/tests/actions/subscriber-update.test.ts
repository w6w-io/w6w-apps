import { assertEquals } from "@std/assert";
import subscriberUpdate from "../../actions/subscriber-update.ts";
import { API_PATH, bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The one that bites: `?email=` is the OLD address and the body's EmailAddress
 * is the new one. Passing the new address in both is how you edit the wrong
 * person.
 */
Deno.test("subscriber-update: the query carries the OLD address, the body the new one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await subscriberUpdate.execute({
    listId: "lid",
    email: "old@example.com",
    newEmail: "new@example.com",
    consentToTrack: "Yes",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/subscribers/lid.json`);
  assertEquals(queryOf(calls[0].url), { email: "old@example.com" });
  assertEquals(bodyOf(calls[0]).EmailAddress, "new@example.com");
  assertEquals(out, { EmailAddress: "new@example.com" });
});

Deno.test("subscriber-update: with no new address, the current one is echoed in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await subscriberUpdate.execute(
    { listId: "lid", email: "same@example.com", name: "Changed", consentToTrack: "Unchanged" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { email: "same@example.com" });
  assertEquals(bodyOf(calls[0]).EmailAddress, "same@example.com");
  assertEquals(bodyOf(calls[0]).Name, "Changed");
  assertEquals(out, { EmailAddress: "same@example.com" });
});

Deno.test("subscriber-update: an empty new address is treated as absent, not as a clear", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await subscriberUpdate.execute(
    { listId: "lid", email: "a@b.com", newEmail: "", consentToTrack: "Yes" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).EmailAddress, "a@b.com");
});

Deno.test("subscriber-update: passes a Clear entry through to the custom fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await subscriberUpdate.execute({
    listId: "lid",
    email: "a@b.com",
    consentToTrack: "Yes",
    customFields: [{ Key: "age", Value: "", Clear: true }],
  }, ctx);
  assertEquals(bodyOf(calls[0]).CustomFields, [{ Key: "age", Value: "", Clear: true }]);
});

Deno.test("subscriber-update: is declared idempotent — an update is a set, not an increment", () => {
  assertEquals(subscriberUpdate.idempotent, true);
});
