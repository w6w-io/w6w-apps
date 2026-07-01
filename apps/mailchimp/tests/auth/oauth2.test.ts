import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Mailchimp's authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://login.mailchimp.com/oauth2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://login.mailchimp.com/oauth2/token");
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://us14.api.mailchimp.com/3.0/lists",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { accessToken: "acc-123" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test with missing accessToken reports the failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test uses cached datacenter from connection.display when present", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { health_status: "Ok" } }], {
    datacenter: "us14",
  });
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://us14.api.mailchimp.com");
  assertEquals(url.pathname, "/3.0/ping");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test falls back to a metadata roundtrip when connection has no datacenter", async () => {
  const { ctx, calls } = mockCtx(
    [
      { status: 200, body: { api_endpoint: "https://eu2.api.mailchimp.com" } },
      { status: 200, body: { health_status: "Ok" } },
    ],
    { display: {} },
  );
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 2);
  assertEquals(new URL(calls[0].url).host, "login.mailchimp.com");
  // Metadata endpoint uses `OAuth <token>`, not Bearer — Mailchimp quirk.
  assertEquals(calls[0].headers["authorization"], "OAuth acc-abc");
  assertEquals(new URL(calls[1].url).origin, "https://eu2.api.mailchimp.com");
});

Deno.test("oauth2: test surfaces the upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }], { datacenter: "us14" });
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("oauth2: afterConnect hits metadata with `OAuth <token>` and stashes datacenter + account", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      api_endpoint: "https://us17.api.mailchimp.com",
      accountname: "Acme",
      user_id: 42,
      login: {
        login_email: "ops@acme.example",
        login_name: "Acme Login",
        login_id: 42,
      },
    },
  }]);
  const result = await auth.afterConnect!(
    { credential: { accessToken: "acc-xyz" } },
    ctx,
  );
  assertEquals(result.datacenter, "us17");
  const account = result.account as Record<string, unknown>;
  assertEquals(account.name, "Acme");
  assertEquals(account.email, "ops@acme.example");
  assertEquals(account.id, 42);
  assertEquals(calls[0].url, "https://login.mailchimp.com/oauth2/metadata");
  assertEquals(calls[0].headers["authorization"], "OAuth acc-xyz");
});

Deno.test("oauth2: afterConnect returns {} when metadata call fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const result = await auth.afterConnect!(
    { credential: { accessToken: "acc-xyz" } },
    ctx,
  );
  assertEquals(result, {});
});
