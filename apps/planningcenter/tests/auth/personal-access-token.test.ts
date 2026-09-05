import { assert, assertEquals } from "@std/assert";
import personalAccessToken, { basicHeader, PROBE_URL } from "../../auth/personal-access-token.ts";
import type { HookContext, SignableRequest } from "@w6w/types";
import { mockCtx, pathOf, single } from "../_helpers.ts";

const CRED = { clientId: "my_client_id", secret: "my_secret" };

Deno.test("sign: stamps the Basic header in the conventional client_id:secret order", () => {
  const request = {
    url: "https://api.planningcenteronline.com/people/v2/people",
    method: "GET",
    headers: {},
  };
  const signed = personalAccessToken.sign!(
    { request: request as unknown as SignableRequest, credential: CRED },
    {} as HookContext,
  ) as SignableRequest;

  assertEquals(signed.headers["authorization"], `Basic ${btoa("my_client_id:my_secret")}`);
});

Deno.test("sign: sets a User-Agent when the caller has not already set one", () => {
  const request = {
    url: "https://api.planningcenteronline.com/people/v2/people",
    method: "GET",
    headers: {},
  };
  const signed = personalAccessToken.sign!(
    { request: request as unknown as SignableRequest, credential: CRED },
    {} as HookContext,
  ) as SignableRequest;

  assert(signed.headers["user-agent"]!.length > 0);
});

Deno.test("test: probes GET /current/v2/me with the signed header", async () => {
  const { ctx, calls } = mockCtx([
    { body: single("Person", "1", { name: "Jane Church" }) },
  ]);
  const out = await personalAccessToken.test({ credential: CRED }, ctx);

  assertEquals(out.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(pathOf(calls[0].url), "/current/v2/me");
  assertEquals(calls[0].headers["authorization"], basicHeader(CRED));
  assert(calls[0].headers["user-agent"]!.length > 0);
});

Deno.test("test: a missing half fails without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await personalAccessToken.test({ credential: { clientId: "only-the-id" } }, ctx);

  assertEquals(out.ok, false);
  assert(out.message!.includes("missing clientId or secret"), out.message);
  assertEquals(calls.length, 0);
});

/**
 * Planning Center answers 401 with an EMPTY body both when no `Authorization`
 * header is sent at all and when a syntactically valid but wrong client_id /
 * secret pair is sent — measured live, 2026-09-05. There is no body to read a
 * distinction from, so 401 is classified from the vendor's own documented
 * meaning of the status code alone ("You did not use the proper API token
 * and/or secret").
 */
Deno.test("test: 401 is read as 'the credential was rejected', from the status alone", async () => {
  const { ctx } = mockCtx([{ status: 401, body: undefined }]);
  const out = await personalAccessToken.test({ credential: CRED }, ctx);

  assertEquals(out.ok, false);
  assert(out.message!.includes("rejected the client_id/secret pair"), out.message);
});

Deno.test("test: 403 is read as a permission problem, not a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 403, body: undefined }]);
  const out = await personalAccessToken.test({ credential: CRED }, ctx);

  assertEquals(out.ok, false);
  assert(out.message!.includes("this user's role lacks access"), out.message);
});

Deno.test("afterConnect: labels the connection with the token owner's name", async () => {
  const { ctx } = mockCtx([
    { body: single("Person", "1", { name: "Jane Church" }) },
  ]);
  const out = await personalAccessToken.afterConnect!({ credential: CRED }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(out.label, "Planning Center (Jane Church)");
});

Deno.test("afterConnect: never throws when the probe fails, and reveals no credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: undefined }]);
  const out = await personalAccessToken.afterConnect!({ credential: CRED }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(out, {});
});
