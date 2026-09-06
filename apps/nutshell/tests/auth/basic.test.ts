import { assert, assertEquals } from "@std/assert";
import type { HookContext, SignableRequest } from "@w6w/types";
import basic, { basicHeader, PROBE_METHOD } from "../../auth/basic.ts";
import { API_URL } from "../../lib/client.ts";
import { mockCtx, rpcBody, TEST_API_KEY, TEST_EMAIL } from "../_helpers.ts";

const CRED = { email: "bot@acme.com", apiKey: "0123456789abcdef" };

Deno.test("basic: is type 'basic' with email + secret apiKey fields", () => {
  assertEquals(basic.type, "basic");
  const keys = (basic.fields ?? []).map((f) => f.key);
  assertEquals(keys, ["email", "apiKey"]);
  assertEquals(basic.fields?.find((f) => f.key === "apiKey")?.type, "secret");
});

Deno.test("basicHeader: base64('email:apiKey')", () => {
  assertEquals(basicHeader({ email: "a@b.com", apiKey: "k" }), `Basic ${btoa("a@b.com:k")}`);
});

Deno.test("sign: stamps the Authorization header and does not touch the body", () => {
  const request = { url: API_URL, method: "POST", headers: {}, body: '{"method":"getLead"}' };
  const signed = basic.sign!(
    { request: request as unknown as SignableRequest, credential: CRED },
    {} as HookContext,
  ) as SignableRequest;
  assertEquals(signed.headers["authorization"], basicHeader(CRED));
  assertEquals(signed.body, '{"method":"getLead"}');
});

Deno.test("test: calls getUpdateTimes with the header set directly (test does not go through sign)", async () => {
  const { ctx, calls } = mockCtx([{ result: { Milestones: null } }]);
  const report = await basic.test({ credential: CRED }, ctx);

  assertEquals(report.ok, true);
  assertEquals(calls[0].url, API_URL);
  assertEquals(calls[0].headers["authorization"], basicHeader(CRED));
  assertEquals(rpcBody(calls[0]).method, PROBE_METHOD);
});

Deno.test("test: reports the vendor's own message on a rejected credential (verified 401 shape)", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    error: { code: 401, message: "API key not found", data: null },
  }]);
  const report = await basic.test({ credential: { ...CRED, apiKey: "wrong" } }, ctx);
  assertEquals(report.ok, false);
  assert(/API key not found/.test(report.message ?? ""));
});

Deno.test("test: fails fast when the credential is missing a half", async () => {
  const { ctx, calls } = mockCtx([]);
  const report = await basic.test({ credential: { email: TEST_EMAIL } }, ctx);
  assertEquals(report.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: apiKey alone without email also fails fast", async () => {
  const { ctx, calls } = mockCtx([]);
  const report = await basic.test({ credential: { apiKey: TEST_API_KEY } }, ctx);
  assertEquals(report.ok, false);
  assertEquals(calls.length, 0);
});
