import { assertEquals, assertRejects } from "@std/assert";
import smartEmailSend, { MAX_TRANSACTIONAL_RECIPIENTS } from "../../actions/smart-email-send.ts";
import { API_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const ACCEPTED = [
  { Status: "Accepted", MessageID: "ddc697c7-0788-4df3-a71a-a7cb935f00bd", Recipient: "a@b.com" },
];

Deno.test("smart-email-send: POSTs to /transactional/smartEmail/{id}/send", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: ACCEPTED }]);
  const out = await smartEmailSend.execute(
    { smartEmailId: "sid", to: "a@b.com", consentToTrack: "Yes" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/transactional/smartEmail/sid/send`);
  // The response is an ARRAY — one MessageID per recipient, not one per call.
  assertEquals(out, ACCEPTED);
  assertEquals(Array.isArray(out), true);
});

Deno.test("smart-email-send: splits comma-separated recipients into arrays", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: ACCEPTED }]);
  await smartEmailSend.execute({
    smartEmailId: "sid",
    to: "Joe Smith <joe@example.com>, jane@example.com",
    bcc: "ops@example.com",
    consentToTrack: "Yes",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.To, ["Joe Smith <joe@example.com>", "jane@example.com"]);
  assertEquals(body.CC, null);
  assertEquals(body.BCC, ["ops@example.com"]);
});

Deno.test("smart-email-send: merges the Data object and defaults AddRecipientsToList off", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: ACCEPTED }]);
  await smartEmailSend.execute({
    smartEmailId: "sid",
    to: "a@b.com",
    data: { username: "joesmith1" },
    consentToTrack: "No",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.Data, { username: "joesmith1" });
  // Boolean here, a list ID on the smart-email-get response.
  assertEquals(body.AddRecipientsToList, false);
  assertEquals(body.ConsentToTrack, "No");
});

Deno.test("smart-email-send: refuses a send with no recipient at all (code 952)", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await smartEmailSend.execute({ smartEmailId: "sid", consentToTrack: "Yes" }, ctx),
    Error,
    "952",
  );
  assertEquals(calls.length, 0);
});

/** The 25 ceiling counts To + CC + BCC together, not each separately. */
Deno.test("smart-email-send: counts the 25 ceiling across To, CC and BCC combined", async () => {
  const { ctx, calls } = mockCtx([]);
  const nine = Array.from({ length: 9 }, (_, i) => `p${i}@example.com`).join(",");
  await assertRejects(
    async () =>
      await smartEmailSend.execute(
        { smartEmailId: "sid", to: nine, cc: nine, bcc: nine, consentToTrack: "Yes" },
        ctx,
      ),
    Error,
    `at most ${MAX_TRANSACTIONAL_RECIPIENTS} recipients`,
  );
  assertEquals(calls.length, 0);
});

Deno.test("smart-email-send: accepts exactly 25 across the three fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: ACCEPTED }]);
  const to = Array.from({ length: 13 }, (_, i) => `t${i}@example.com`).join(",");
  const cc = Array.from({ length: 12 }, (_, i) => `c${i}@example.com`).join(",");
  await smartEmailSend.execute({ smartEmailId: "sid", to, cc, consentToTrack: "Yes" }, ctx);
  assertEquals(calls.length, 1);
});

/** It sends mail and there is no idempotency key anywhere in this API. */
Deno.test("smart-email-send: is declared NOT idempotent", () => {
  assertEquals(smartEmailSend.idempotent, false);
});
