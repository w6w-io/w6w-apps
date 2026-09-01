import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const cred = { apiKey: "bmk_testkey123" };

Deno.test("api-key: declares one secret field and the apiKey wire type", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "X-API-KEY" });
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["apiKey"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
});

Deno.test("api-key: sign stamps the X-API-KEY header verbatim and returns the request", async () => {
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, mockCtx().ctx);
  assertEquals(out.headers["x-api-key"], cred.apiKey);
});

Deno.test("api-key: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  await auth.sign!(
    { request: { url: "https://x", method: "GET", headers: {} }, credential: cred },
    ctx,
  );
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes GET /v2/user/current with the credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 1, Name: "A", Email: "a@b.com" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.bloomerang.co/v2/user/current");
  assertEquals(calls[0].headers["x-api-key"], cred.apiKey);
});

Deno.test("api-key: test fails without a network call when the key is missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test reports Bloomerang's own 401 message for a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { Message: "Invalid Credentials", ErrorCode: 109 },
  }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Invalid Credentials");
});

Deno.test("api-key: test surfaces Bloomerang's own error message on other failures", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { Message: "Internal error" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Internal error");
});

Deno.test("api-key: test falls back to the status when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("500"));
});

Deno.test("afterConnect: publishes user display data, never the key", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { Id: 42, Name: "Anthony Nemitz", Email: "anthony@example.org" },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.bloomerang.co/v2/user/current");
  const user = display.user as Record<string, unknown>;
  assertEquals(user.id, "42");
  assertEquals(user.name, "Anthony Nemitz");
  assertEquals(user.email, "anthony@example.org");
  // Nothing about the credential may reach the Connection's display data.
  assertEquals(JSON.stringify(display).includes(cred.apiKey), false);
});

Deno.test("afterConnect: degrades to empty display data rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx);
  assertEquals(display, {});
});
