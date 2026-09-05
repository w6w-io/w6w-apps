import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: signs with a literal `Bearer <token>` Authorization header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://live-mt-server.wati.io/12345/api/ext/v3/account/credits",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "abc123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer abc123");
});

Deno.test("api-token: baseUrl and apiToken are both required; apiToken is a secret field", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["apiToken", "baseUrl"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["apiToken"]);
});

Deno.test("api-token: apiKey config uses a header with a Bearer prefix", () => {
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
});

Deno.test("api-token: test succeeds on a 200 with a credit balance body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { credit: 42.5, welcome_credit: 0 } }]);
  const out = await auth.test(
    {
      credential: {
        apiToken: "t1",
        baseUrl: "https://live-mt-server.wati.io/12345",
      },
    } as never,
    ctx,
  );
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, "https://live-mt-server.wati.io/12345/api/ext/v3/account/credits");
  assertEquals(calls[0].headers["authorization"], "Bearer t1");
});

Deno.test("api-token: a structured Wati error fails with the vendor's own code/message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: {
      code: 4030,
      message: "This token does not have the required scope.",
      timestamp: "2026-09-05T00:00:00Z",
    },
  }]);
  const out = await auth.test(
    { credential: { apiToken: "bad", baseUrl: "https://live-mt-server.wati.io/12345" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(out.ok, false);
  assert(out.message.includes("4030"), out.message);
  assert(out.message.includes("required scope"), out.message);
});

Deno.test("api-token: a bodyless 401 fails without crashing (documented as bodyless)", async () => {
  const { ctx } = mockCtx([{ status: 401, body: undefined, headers: {} }]);
  const out = await auth.test(
    { credential: { apiToken: "bad", baseUrl: "https://live-mt-server.wati.io/12345" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(out.ok, false);
  assert(out.message.includes("401"), out.message);
});

Deno.test("api-token: missing fields fail before any network call", async () => {
  const noToken = mockCtx([]);
  assertEquals(
    await auth.test({ credential: { baseUrl: "https://x.wati.io/1" } } as never, noToken.ctx),
    { ok: false, message: "credential missing apiToken" },
  );
  const noBaseUrl = mockCtx([]);
  assertEquals(
    await auth.test({ credential: { apiToken: "t" } } as never, noBaseUrl.ctx),
    { ok: false, message: "credential missing baseUrl" },
  );
  assertEquals(noToken.calls.length + noBaseUrl.calls.length, 0);
});

Deno.test("api-token: afterConnect persists the normalised baseUrl, never the token", async () => {
  const display = await auth.afterConnect!(
    {
      credential: {
        apiToken: "secret",
        baseUrl: "live-mt-server.wati.io/12345/api/v1/getContacts",
      },
    } as never,
    mockCtx().ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { baseUrl: "https://live-mt-server.wati.io/12345" });
  assert(!JSON.stringify(display).includes("secret"), "the credential leaked into display");
});
