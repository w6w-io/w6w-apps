import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: signs with X-Cybozu-API-Token, verbatim (supports comma-separated tokens)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.cybozu.com/k/v1/record.json",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "t1,t2" } }, ctx);
  assertEquals(out.headers["x-cybozu-api-token"], "t1,t2");
});

Deno.test("api-token: baseUrl, apiToken and testAppId are required; guestSpaceId is not", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["apiToken", "baseUrl", "testAppId"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["apiToken"]);
});

Deno.test("api-token: test succeeds on a 200 with an appId body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { appId: "1", name: "ToDo App" } }]);
  const out = await auth.test(
    {
      credential: { apiToken: "t1", baseUrl: "https://acme.cybozu.com", testAppId: "1" },
    } as never,
    ctx,
  );
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/v1/app.json?id=1");
  assertEquals(calls[0].headers["x-cybozu-api-token"], "t1");
});

Deno.test("api-token: test routes through the Guest Space path when configured", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { appId: "1" } }]);
  await auth.test(
    {
      credential: {
        apiToken: "t1",
        baseUrl: "https://acme.cybozu.com",
        guestSpaceId: "5",
        testAppId: "1",
      },
    } as never,
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/guest/5/v1/app.json?id=1");
});

Deno.test("api-token: a structured Kintone error fails with the vendor's own code/message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { code: "GAIA_NO01", id: "abc", message: "No privilege to proceed." },
  }]);
  const out = await auth.test(
    {
      credential: { apiToken: "bad", baseUrl: "https://acme.cybozu.com", testAppId: "1" },
    } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(out.ok, false);
  assert(out.message.includes("GAIA_NO01"), out.message);
  assert(out.message.includes("No privilege to proceed."), out.message);
});

Deno.test("api-token: a non-JSON response (Cybozu's edge decoy) fails as unreachable, not as a rejection", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: "<html><body>このリンクは不正です。</body></html>",
  }]);
  const out = await auth.test(
    { credential: { apiToken: "t1", baseUrl: "https://nope.cybozu.com", testAppId: "1" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(out.ok, false);
  assert(out.message.includes("no Kintone tenant"), out.message);
});

Deno.test("api-token: missing fields fail before any network call", async () => {
  const noToken = mockCtx([]);
  assertEquals(
    await auth.test(
      { credential: { baseUrl: "https://x.cybozu.com", testAppId: "1" } } as never,
      noToken.ctx,
    ),
    { ok: false, message: "credential missing apiToken" },
  );
  const noAppId = mockCtx([]);
  assertEquals(
    await auth.test(
      { credential: { apiToken: "t", baseUrl: "https://x.cybozu.com" } } as never,
      noAppId.ctx,
    ),
    { ok: false, message: "credential missing testAppId" },
  );
  assertEquals(noToken.calls.length + noAppId.calls.length, 0);
});

Deno.test("api-token: afterConnect persists the normalised baseUrl and guestSpaceId, never the token", async () => {
  const display = await auth.afterConnect!(
    {
      credential: {
        apiToken: "secret",
        baseUrl: "acme.cybozu.com/",
        guestSpaceId: "5",
        testAppId: "1",
      },
    } as never,
    mockCtx().ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { baseUrl: "https://acme.cybozu.com", guestSpaceId: "5" });
  assert(!JSON.stringify(display).includes("secret"), "the credential leaked into display");
});
