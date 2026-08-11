import { assertEquals, assertRejects } from "@std/assert";
import classicEmailSend from "../../actions/classic-email-send.ts";
import { API_PATH, bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const ACCEPTED = [
  { Status: "Accepted", Recipient: "a@b.com", MessageID: "549f114b-aa76-11e4-8b24-2fa9fbbe36ff" },
];

const BASE = {
  subject: "Thanks for signing up",
  from: "Mike Smith <mike@example.com>",
  to: "a@b.com",
  html: "<p>hi</p>",
  consentToTrack: "Yes",
};

Deno.test("classic-email-send: POSTs to /transactional/classicEmail/send, no extension", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: ACCEPTED }]);
  const out = await classicEmailSend.execute({ ...BASE }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/transactional/classicEmail/send`);
  assertEquals(out, ACCEPTED);
});

Deno.test("classic-email-send: sends clientID in the query when supplied, and omits it otherwise", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: ACCEPTED }, {
    status: 202,
    body: ACCEPTED,
  }]);
  await classicEmailSend.execute({ ...BASE, clientId: "cid" }, ctx);
  assertEquals(queryOf(calls[0].url), { clientID: "cid" });

  await classicEmailSend.execute({ ...BASE }, ctx);
  assertEquals(queryOf(calls[1].url), {});
});

/** All three default to true at the vendor, so they are sent explicitly. */
Deno.test("classic-email-send: tracking and inline-CSS flags default to true", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: ACCEPTED }]);
  await classicEmailSend.execute({ ...BASE }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.TrackOpens, true);
  assertEquals(body.TrackClicks, true);
  assertEquals(body.InlineCSS, true);
});

Deno.test("classic-email-send: an explicit false tracking flag is preserved", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: ACCEPTED }]);
  await classicEmailSend.execute({ ...BASE, trackOpens: false, trackClicks: false }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.TrackOpens, false);
  assertEquals(body.TrackClicks, false);
});

Deno.test("classic-email-send: refuses a message with neither HTML nor text (code 960)", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await classicEmailSend.execute(
        { subject: "s", from: "a@b.com", to: "c@d.com", consentToTrack: "Yes" },
        ctx,
      ),
    Error,
    "960",
  );
  assertEquals(calls.length, 0);
});

Deno.test("classic-email-send: refuses a send with no recipient (code 952)", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await classicEmailSend.execute({ ...BASE, to: undefined }, ctx),
    Error,
    "952",
  );
  assertEquals(calls.length, 0);
});

Deno.test("classic-email-send: is declared NOT idempotent", () => {
  assertEquals(classicEmailSend.idempotent, false);
});
