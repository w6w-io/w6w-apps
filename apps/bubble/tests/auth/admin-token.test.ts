import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/admin-token.ts";

Deno.test("admin-token: signs with Bearer, not a custom scheme", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x.bubbleapps.io/api/1.1/obj/thing",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "t1" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer t1");
});

Deno.test("admin-token: baseUrl and apiToken are required; testDataType is not", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["apiToken", "baseUrl"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["apiToken"]);
});

Deno.test("admin-token: test succeeds on a 200 with a `response` body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { response: { results: [] } } }]);
  const out = await auth.test(
    { credential: { apiToken: "t1", baseUrl: "myapp.bubbleapps.io" } } as never,
    ctx,
  );
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, "https://myapp.bubbleapps.io/api/1.1/obj/user?limit=1");
  assertEquals(calls[0].headers["authorization"], "Bearer t1");
});

Deno.test("admin-token: test probes the configured testDataType, formatted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { response: { results: [] } } }]);
  await auth.test(
    {
      credential: {
        apiToken: "t1",
        baseUrl: "https://myapp.bubbleapps.io",
        testDataType: "Rental Unit",
      },
    } as never,
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/1.1/obj/rentalunit");
});

Deno.test("admin-token: a 401 fails without ever surfacing the echoed token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      error_class: "Unauthorized",
      args: { code: "x" },
      message: null,
      translation: "Invalid or expired token: t1",
    },
  }]);
  const out = await auth.test(
    { credential: { apiToken: "t1", baseUrl: "https://x.com" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(out.ok, false);
  assert(!out.message.includes("t1"), `message must not echo the token: ${out.message}`);
  assert(out.message.includes("401"), out.message);
});

Deno.test("admin-token: a 404 fails with the ambiguity spelled out, and surfaces Bubble's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      statusCode: 404,
      body: { status: "NOT_FOUND", message: "This application does not expose a Data API" },
    },
  }]);
  const out = await auth.test(
    { credential: { apiToken: "t1", baseUrl: "https://x.com" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(out.ok, false);
  assert(out.message.includes("Data API Settings"), out.message);
  assert(out.message.includes("This application does not expose a Data API"), out.message);
});

Deno.test("admin-token: missing fields fail before any network call", async () => {
  const noToken = mockCtx([]);
  assertEquals(
    await auth.test({ credential: { baseUrl: "https://x.com" } } as never, noToken.ctx),
    { ok: false, message: "credential missing apiToken" },
  );
  const noUrl = mockCtx([]);
  assertEquals(
    await auth.test({ credential: { apiToken: "t" } } as never, noUrl.ctx),
    { ok: false, message: "credential missing baseUrl" },
  );
  assertEquals(noToken.calls.length + noUrl.calls.length, 0);
});

Deno.test("admin-token: afterConnect persists the normalised baseUrl, never the token", async () => {
  const display = await auth.afterConnect!(
    { credential: { apiToken: "secret", baseUrl: "myapp.bubbleapps.io/version-test/" } } as never,
    mockCtx().ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { baseUrl: "https://myapp.bubbleapps.io/version-test" });
  assert(!JSON.stringify(display).includes("secret"), "the credential leaked into display");
});
