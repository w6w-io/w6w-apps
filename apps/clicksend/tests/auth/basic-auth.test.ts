import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { authHeader, usagePath } from "../../auth/basic-auth.ts";

Deno.test("authHeader: builds a standard HTTP Basic header from username:apiKey", () => {
  const header = authHeader({ username: "Aladdin", apiKey: "open sesame" });
  assertEquals(header, "Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==");
});

Deno.test("usagePath: builds the 1-indexed year/month/subaccount path", () => {
  const path = usagePath(new Date(Date.UTC(2026, 7, 24))); // August is month index 7
  assertEquals(path, "/account/usage/2026/8/subaccount");
});

Deno.test("sign: stamps the Basic auth header and does not mutate other headers", async () => {
  const request = {
    url: "https://rest.clicksend.com/v3/sms/send",
    headers: { accept: "application/json" },
    method: "POST" as const,
  };
  const out = await auth.sign!(
    { request, credential: { username: "user", apiKey: "key" } } as never,
    {} as never,
  );
  assertEquals(out.headers["authorization"], authHeader({ username: "user", apiKey: "key" }));
  assertEquals(out.headers["accept"], "application/json");
});

Deno.test("test: reports ok on a live credential", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "Here is your usage statistics.",
        data: { sms: [] },
      },
    },
  ]);
  const result = await auth.test!(
    { credential: { username: "user", apiKey: "key" } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url.includes("/account/usage/"), true);
  assertEquals(calls[0].url.endsWith("/subaccount"), true);
  assertEquals(calls[0].headers["authorization"], authHeader({ username: "user", apiKey: "key" }));
});

Deno.test("test: reports missing credential fields without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: { username: "", apiKey: "" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: a 401 (missing, wrong, or inactive) says ClickSend cannot distinguish them", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: {
        http_code: 401,
        response_code: "UNAUTHORIZED",
        response_msg: "Authorization failed.",
        data: null,
      },
    },
  ]);
  const result = await auth.test!(
    { credential: { username: "user", apiKey: "wrong" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals((result as { message: string }).message.includes("does not distinguish"), true);
});

Deno.test("test: a 403 surfaces ClickSend's own suspended-account message", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: {
        response_code: "FORBIDDEN",
        http_code: 403,
        response_msg: "Your account is suspended. Please contact support for more information.",
      },
    },
  ]);
  const result = await auth.test!(
    { credential: { username: "banned", apiKey: "key" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(
    (result as { message: string }).message.includes("Your account is suspended"),
    true,
  );
});

Deno.test("test: an unexpected status is reported with the raw ClickSend message", async () => {
  const { ctx } = mockCtx([
    { status: 500, body: { response_code: "INTERNAL_ERROR", response_msg: "Something broke." } },
  ]);
  const result = await auth.test!(
    { credential: { username: "user", apiKey: "key" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals((result as { message: string }).message.includes("500"), true);
  assertEquals((result as { message: string }).message.includes("Something broke."), true);
});
