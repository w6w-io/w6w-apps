import { assert, assertEquals } from "@std/assert";
import accessToken, {
  authHeaders,
  explainProbeFailure,
  PROBE_PATH,
} from "../../auth/access-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("access-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    url: "https://api.companycam.com/v2/projects",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = accessToken.sign!({ request, credential: { accessToken: "tok_live" } }, {
    fetch: () => {
      throw new Error("sign must not reach the network");
    },
    log: () => {},
  } as never) as typeof request;
  assertEquals(signed.headers.authorization, "Bearer tok_live");
  assertEquals(Object.keys(signed.headers), ["authorization"]);
});

Deno.test("access-token: the token never appears in a URL", () => {
  const request = {
    url: "https://api.companycam.com/v2/projects",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  accessToken.sign!({ request, credential: { accessToken: "tok_live" } }, {
    fetch: () => {
      throw new Error("no network");
    },
    log: () => {},
  } as never);
  assert(!request.url.includes("tok_live"), "the credential leaked into the URL");
});

Deno.test("access-token: authHeaders is the one place the wire format is built", () => {
  assertEquals(authHeaders({ accessToken: "abc" }), { authorization: "Bearer abc" });
});

Deno.test("access-token: test probes /users/current, not a webhook read", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", email_address: "a@b.com" } }]);
  assertEquals(await accessToken.test({ credential: { accessToken: "tok" } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/users/current");
  assertEquals(calls[0].headers.authorization, "Bearer tok");
  assertEquals(PROBE_PATH, "/users/current");
});

Deno.test("access-token: a missing credential fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await accessToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: a 401 names both causes rather than guessing one", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  const result = await accessToken.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(/401/.test(result.message!), result.message);
  assert(/copied exactly/.test(result.message!), result.message);
  assert(/revoked/.test(result.message!), result.message);
  // The message must never echo the credential back.
  assert(!result.message!.includes("bad"), "the probe echoed the credential");
});

Deno.test("access-token: an HTML answer is reported as never reaching the API", () => {
  const message = explainProbeFailure(200, "text/html; charset=utf-8", "<html>Sign in</html>");
  assert(/did not reach/.test(message), message);
});

Deno.test("access-token: a 403 blames the plan, not the token", () => {
  const message = explainProbeFailure(403, "application/json", '{"errors":["Forbidden"]}');
  assert(/403/.test(message));
  assert(/Pro, Premium or Elite/.test(message), message);
});

Deno.test("access-token: afterConnect publishes the email and drops the rest", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "9",
      company_id: "8",
      email_address: "shawn@psych.co",
      first_name: "Shawn",
      last_name: "Spencer",
      phone_number: "4025551212",
      profile_image: [{ type: "original", uri: "https://x/y.jpg" }],
    },
  }]);
  const label = await accessToken.afterConnect!({ credential: { accessToken: "tok" } }, ctx) as {
    user: Record<string, unknown>;
  };
  assertEquals(label.user, {
    id: "9",
    email: "shawn@psych.co",
    name: "Shawn Spencer",
    companyId: "8",
  });
  const serialised = JSON.stringify(label);
  assert(!serialised.includes("4025551212"), "the phone number was published");
  assert(!serialised.includes("profile_image"), "the profile image was published");
});

Deno.test("access-token: a failed afterConnect is silent, not fatal", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("boom") }]);
  assertEquals(await accessToken.afterConnect!({ credential: { accessToken: "t" } }, ctx), {});
});

Deno.test("access-token: the credential field is a secret", () => {
  assertEquals(accessToken.key, "access-token");
  assertEquals(accessToken.type, "bearer");
  assertEquals(accessToken.fields?.length, 1);
  assertEquals(accessToken.fields?.[0].key, "accessToken");
  assertEquals(accessToken.fields?.[0].type, "secret");
  assertEquals(accessToken.fields?.[0].required, true);
});
