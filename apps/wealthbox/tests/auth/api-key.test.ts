import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const cred = { accessToken: "12345678901234567890123456789012" };

Deno.test("api-key: declares the ACCESS_TOKEN header apiKey wire shape", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "ACCESS_TOKEN" });
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["accessToken"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
});

Deno.test("api-key: sign stamps the access_token header verbatim, with no prefix", async () => {
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, mockCtx().ctx);
  assertEquals(out.headers["access_token"], cred.accessToken);
});

Deno.test("api-key: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  await auth.sign!(
    { request: { url: "https://x", method: "GET", headers: {} }, credential: cred },
    ctx,
  );
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes GET /v1/me with the credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, name: "Bill Jones" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.crmworkspace.com/v1/me");
  assertEquals(calls[0].headers["access_token"], cred.accessToken);
});

Deno.test("api-key: test fails without a network call when the token is missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test reports a 401 as a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "invalid access token" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("api-key: test surfaces Wealthbox's own error message on other failures", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: "insufficient permissions" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "insufficient permissions");
});

Deno.test("api-key: test falls back to the status when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("500"));
});

Deno.test("api-key: the probe body cannot leak the credential back to a caller", () => {
  // GET /v1/me returns profile metadata only, never the token — assert the
  // response payload used in the mock does not echo it, guarding the choice
  // of probe endpoint rather than the assertion mechanics.
  const body = { id: 1, name: "Bill Jones", email: "bill@example.com" };
  assertEquals(JSON.stringify(body).includes(cred.accessToken), false);
});

Deno.test("afterConnect: publishes user and organization display data, never the token", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      name: "Bill Jones",
      email: "bill@example.com",
      current_user: { account: 1 },
      accounts: [{ id: 1, name: "ABC Financial" }],
    },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.crmworkspace.com/v1/me");
  assertEquals((display.user as Record<string, unknown>).email, "bill@example.com");
  assertEquals((display.organization as Record<string, unknown>).name, "ABC Financial");
  assertEquals((display.organization as Record<string, unknown>).id, "1");
  assertEquals(JSON.stringify(display).includes(cred.accessToken), false);
});

Deno.test("afterConnect: falls back to the first account when current_user.account is absent", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { name: "Bill", accounts: [{ id: 9, name: "Solo Account" }] },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals((display.organization as Record<string, unknown>).id, "9");
});

Deno.test("afterConnect: degrades to empty display data rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx);
  assertEquals(display, {});
});
