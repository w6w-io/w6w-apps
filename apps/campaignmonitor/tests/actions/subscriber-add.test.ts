import { assertEquals } from "@std/assert";
import subscriberAdd from "../../actions/subscriber-add.ts";
import { API_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-add: POSTs to /subscribers/{listid}.json", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JSON.stringify("new@example.com") }]);
  const out = await subscriberAdd.execute(
    { listId: "lid", email: "new@example.com", consentToTrack: "Yes" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/subscribers/lid.json`);
  // A bare JSON string comes back; it is wrapped into an object here.
  assertEquals(out, { EmailAddress: "new@example.com" });
});

Deno.test("subscriber-add: Resubscribe defaults OFF, matching the API", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JSON.stringify("a@b.com") }]);
  await subscriberAdd.execute({ listId: "lid", email: "a@b.com", consentToTrack: "Yes" }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.Resubscribe, false);
  assertEquals(body.RestartSubscriptionBasedAutoresponders, false);
});

Deno.test("subscriber-add: sends consent, mobile number and custom fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JSON.stringify("a@b.com") }]);
  await subscriberAdd.execute({
    listId: "lid",
    email: "a@b.com",
    name: "New Subscriber",
    mobileNumber: "+5012398752",
    customFields: [{ Key: "website", Value: "https://example.com" }],
    consentToTrack: "Unchanged",
    consentToSendSms: "Yes",
    resubscribe: true,
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.EmailAddress, "a@b.com");
  assertEquals(body.Name, "New Subscriber");
  assertEquals(body.MobileNumber, "+5012398752");
  assertEquals(body.CustomFields, [{ Key: "website", Value: "https://example.com" }]);
  assertEquals(body.ConsentToTrack, "Unchanged");
  assertEquals(body.ConsentToSendSms, "Yes");
  assertEquals(body.Resubscribe, true);
});

Deno.test("subscriber-add: accepts custom fields typed as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JSON.stringify("a@b.com") }]);
  await subscriberAdd.execute({
    listId: "lid",
    email: "a@b.com",
    consentToTrack: "Yes",
    customFields: '[{"Key":"age","Value":"24"}]',
  }, ctx);
  assertEquals(bodyOf(calls[0]).CustomFields, [{ Key: "age", Value: "24" }]);
});

/** An upsert keyed on the address, and the welcome mail goes to new subscribers only. */
Deno.test("subscriber-add: is declared idempotent", () => {
  assertEquals(subscriberAdd.idempotent, true);
});
