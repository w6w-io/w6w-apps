import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  encodeForm,
  formatWebinarJamError,
  WebinarJamClient,
  type WebinarJamEnvelope,
} from "../../lib/client.ts";
import { failure, mockWebinarJamCtx, ok } from "../_helpers.ts";

Deno.test("encodeForm: drops unset values, keeps falsy-but-meaningful ones", () => {
  const out = encodeForm({ a: "1", b: undefined, c: null, d: "", e: 0, f: false });
  const params = new URLSearchParams(out);
  assertEquals(params.get("a"), "1");
  assertEquals(params.has("b"), false);
  assertEquals(params.has("c"), false);
  assertEquals(params.has("d"), false);
  assertEquals(params.get("e"), "0");
  assertEquals(params.get("f"), "0");
});

Deno.test("encodeForm: booleans render as 1/0, matching twilio_consent's documented values", () => {
  const out = encodeForm({ twilio_consent: true });
  assertEquals(new URLSearchParams(out).get("twilio_consent"), "1");
});

Deno.test("encodeForm: arrays use bracket notation, for a multi-select custom field", () => {
  const out = encodeForm({ whereDidYouHearAboutUs: ["id_1", "id_2"] });
  const params = new URLSearchParams(out);
  assertEquals(params.getAll("whereDidYouHearAboutUs[]"), ["id_1", "id_2"]);
});

Deno.test("formatWebinarJamError: joins every field's message", () => {
  const body: WebinarJamEnvelope = { status: "error", errors: { api_key: "bad key" } };
  const msg = formatWebinarJamError(401, "/webinarjam/webinars", body, JSON.stringify(body));
  assert(msg.includes("api_key: bad key"), msg);
});

Deno.test("formatWebinarJamError: handles the array-shaped error value observed live", () => {
  const body: WebinarJamEnvelope = {
    status: "error",
    errors: { api_key: ["The api key field is required."] },
  };
  const msg = formatWebinarJamError(400, "/webinarjam/webinars", body, "");
  assert(msg.includes("The api key field is required."), msg);
});

Deno.test("formatWebinarJamError: a 429 states the documented ceiling", () => {
  const body: WebinarJamEnvelope = { status: "error", errors: { api_key: "rate limited" } };
  const msg = formatWebinarJamError(429, "/webinarjam/webinars", body, "");
  assert(msg.includes("20 API calls/second"), msg);
});

Deno.test("formatWebinarJamError: falls back to the raw body when there is no errors field", () => {
  const msg = formatWebinarJamError(500, "/webinarjam/webinars", null, "internal error");
  assert(msg.includes("internal error"), msg);
});

Deno.test("WebinarJamClient.request: POSTs form-urlencoded to {product}{path}", async () => {
  const { ctx, calls } = mockWebinarJamCtx([{ body: ok({ webinars: [] }) }]);
  const body = await new WebinarJamClient(ctx).request("webinarjam", "/webinars");
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/webinarjam/webinars");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals((body as { webinars: unknown[] }).webinars, []);
});

Deno.test("WebinarJamClient.request: the everwebinar product hits the everwebinar prefix", async () => {
  const { ctx, calls } = mockWebinarJamCtx([{ body: ok({ webinars: [] }) }]);
  await new WebinarJamClient(ctx).request("everwebinar", "/webinars");
  assertEquals(new URL(calls[0].url).pathname, "/everwebinar/webinars");
});

Deno.test("WebinarJamClient.request: 204 (unsubscribe) resolves to undefined, not a parse error", async () => {
  const { ctx } = mockWebinarJamCtx([{ status: 204 }]);
  const body = await new WebinarJamClient(ctx).request("webinarjam", "/unsubscribe", {
    webinar_id: 1,
    lead_id: 2,
  });
  assertEquals(body, undefined);
});

Deno.test("WebinarJamClient.request: a 200 with status:error still throws", async () => {
  const { ctx } = mockWebinarJamCtx([{
    status: 200,
    body: failure({ webinar_id: "not found" }),
  }]);
  await assertRejects(
    async () => {
      await new WebinarJamClient(ctx).request("webinarjam", "/webinar", { webinar_id: 999 });
    },
    Error,
    "not found",
  );
});

Deno.test("WebinarJamClient.request: a non-2xx status throws with the vendor's field errors", async () => {
  const { ctx } = mockWebinarJamCtx([{
    status: 401,
    body: failure({ api_key: "You must specify a valid API key" }),
  }]);
  await assertRejects(
    async () => {
      await new WebinarJamClient(ctx).request("webinarjam", "/webinars");
    },
    Error,
    "You must specify a valid API key",
  );
});
