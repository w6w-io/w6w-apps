import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: uses Google's identity endpoints with offline access", () => {
  assertEquals(auth.oauth2!.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2!.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2!.refreshUrl, "https://oauth2.googleapis.com/token");
  // Without both of these Google does not reliably return a refresh token.
  assertEquals(auth.oauth2!.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2!.extraAuthParams?.prompt, "consent");
  assertEquals(auth.oauth2!.pkce, true);
});

Deno.test("oauth2: asks for both the read and write Search Console scopes", () => {
  assertEquals(auth.oauth2!.scopes, [
    "https://www.googleapis.com/auth/webmasters",
    "https://www.googleapis.com/auth/webmasters.readonly",
  ]);
});

Deno.test("oauth2: signs with the bearer", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://searchconsole.googleapis.com/webmasters/v3/sites",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at");
});

Deno.test("oauth2: test probes the one endpoint that needs no site", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { siteEntry: [] } }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://searchconsole.googleapis.com/webmasters/v3/sites");
});

Deno.test("oauth2: an account with zero verified sites still tests ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), { ok: true });
});

Deno.test("oauth2: 401 is reported as a rejected token, distinct from other errors", async () => {
  const unauth = mockCtx([{ status: 401, body: { error: { status: "UNAUTHENTICATED" } } }]);
  const a = await auth.test!({ credential: { accessToken: "at" } } as never, unauth.ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(a.ok, false);
  assert(a.message.includes("401"), a.message);

  const serverError = mockCtx([{ status: 500, body: "" }]);
  const b = await auth.test!(
    { credential: { accessToken: "at" } } as never,
    serverError.ctx,
  ) as { ok: boolean; message: string };
  assertEquals(b.ok, false);
  assert(b.message.includes("500"), b.message);
});

Deno.test("oauth2: test never echoes the credential it was handed", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const out = await auth.test!(
    { credential: { accessToken: "super-secret-token" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assert(!out.message.includes("super-secret-token"));
});

Deno.test("oauth2: afterConnect records the first verified site", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { siteEntry: [{ siteUrl: "https://www.example.com/", permissionLevel: "SITE_OWNER" }] },
  }]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "at" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://searchconsole.googleapis.com/webmasters/v3/sites");
  assertEquals(display.siteUrl, "https://www.example.com/");
  assertEquals(display.permissionLevel, "SITE_OWNER");
});

Deno.test("oauth2: afterConnect is best-effort — no sites and a failed lookup both leave siteUrl unset", async () => {
  const empty = mockCtx([{ status: 200, body: {} }]);
  assertEquals(
    await auth.afterConnect!({ credential: { accessToken: "at" } } as never, empty.ctx),
    {},
  );

  const failed = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    await auth.afterConnect!({ credential: { accessToken: "at" } } as never, failed.ctx),
    {},
  );
});
