import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/personal-access-token.ts";

const SIGNIN_OK = {
  status: 200,
  body: {
    credentials: {
      token: "tok1",
      estimatedTimeToExpiration: "0:04:00",
      site: { id: "site-1" },
      user: { id: "user-1" },
    },
  },
};

Deno.test("exchange: trades the PAT for a session and stores both halves", async () => {
  const { ctx, calls } = mockCtx([SIGNIN_OK]);
  const credential = await auth.exchange!({
    fields: {
      baseUrl: "10ax.online.tableau.com",
      siteContentUrl: "marketing",
      patName: "n1",
      patSecret: "s1",
    },
  }, ctx) as Record<string, unknown>;

  assertEquals(credential.baseUrl, "https://10ax.online.tableau.com");
  assertEquals(credential.siteContentUrl, "marketing");
  assertEquals(credential.patName, "n1");
  assertEquals(credential.patSecret, "s1");
  assertEquals(credential.token, "tok1");
  assertEquals(credential.siteId, "site-1");
  assertEquals(credential.apiVersion, "3.21");
  assertEquals(calls[0].url, "https://10ax.online.tableau.com/api/3.21/auth/signin");
});

Deno.test("exchange: requires a server URL and both PAT fields", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(auth.exchange!({ fields: { patName: "n", patSecret: "s" } }, ctx)),
    Error,
    "Server URL is required",
  );
  await assertRejects(
    () => Promise.resolve(auth.exchange!({ fields: { baseUrl: "x.com" } }, ctx)),
    Error,
    "Name and Secret",
  );
});

Deno.test("exchange: rejects an untrimmed empty PAT secret before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        auth.exchange!({ fields: { baseUrl: "x.com", patName: "n", patSecret: "  " } }, ctx),
      ),
    Error,
    "Name and Secret",
  );
  assertEquals(calls.length, 0);
});

Deno.test("sign: stamps X-Tableau-Auth, never Authorization", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x.com/api/3.21/sites/s1/projects",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { token: "tok1" } }, ctx);
  assertEquals(out.headers["x-tableau-auth"], "tok1");
  assertEquals(out.headers["authorization"], undefined);
});

Deno.test("test: a live session probes GET /projects?pageSize=1 with the session header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { projects: {} } }]);
  const result = await auth.test!({
    credential: { token: "tok1", baseUrl: "https://x.com", siteId: "s1", apiVersion: "3.21" },
  }, ctx);
  assertEquals(result, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/3.21/sites/s1/projects");
  assertEquals(url.searchParams.get("pageSize"), "1");
  assertEquals(calls[0].headers["x-tableau-auth"], "tok1");
});

Deno.test("test: an idled-out session is diagnosed as 401, not a generic failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  const result = await auth.test!(
    { credential: { token: "tok1", baseUrl: "https://x.com", siteId: "s1" } },
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(result.ok, false);
  assert(result.message.includes("idled out"), result.message);
});

Deno.test("test: 403 is reported distinctly from a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  const result = await auth.test!(
    { credential: { token: "tok1", baseUrl: "https://x.com", siteId: "s1" } },
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(result.ok, false);
  assert(result.message.includes("403"), result.message);
});

Deno.test("test: missing credential fields fail before any network call", async () => {
  const noToken = mockCtx([]);
  assertEquals(
    await auth.test!({ credential: { baseUrl: "https://x.com", siteId: "s1" } }, noToken.ctx),
    { ok: false, message: "credential missing a session token — reconnect" },
  );
  const noSite = mockCtx([]);
  assertEquals(
    await auth.test!({ credential: { token: "t", baseUrl: "https://x.com" } }, noSite.ctx),
    { ok: false, message: "credential missing siteId — reconnect" },
  );
  assertEquals(noToken.calls.length + noSite.calls.length, 0);
});

Deno.test("afterConnect: records the server/site/user, never the PAT secret or session token", async () => {
  const { ctx } = mockCtx();
  const display = await auth.afterConnect!({
    credential: {
      baseUrl: "https://10ax.online.tableau.com/",
      siteContentUrl: "marketing",
      siteId: "site-1",
      userId: "user-1",
      apiVersion: "3.21",
      patSecret: "supersecret",
      token: "tok1",
    },
  }, ctx) as Record<string, unknown>;

  assertEquals(display, {
    baseUrl: "https://10ax.online.tableau.com",
    siteContentUrl: "marketing",
    siteId: "site-1",
    userId: "user-1",
    apiVersion: "3.21",
  });
  assert(!JSON.stringify(display).includes("supersecret"), "the PAT secret leaked into display");
  assert(!JSON.stringify(display).includes("tok1"), "the session token leaked into display");
});

Deno.test("refresh: re-signs-in with the stored PAT and returns a fresh session", async () => {
  const { ctx, calls } = mockCtx([SIGNIN_OK]);
  const refreshed = await auth.refresh!({
    credential: {
      baseUrl: "https://10ax.online.tableau.com",
      siteContentUrl: "marketing",
      patName: "n1",
      patSecret: "s1",
      apiVersion: "3.21",
      token: "stale",
      siteId: "site-1",
      userId: "user-1",
    },
  }, ctx) as Record<string, unknown>;

  assertEquals(refreshed.token, "tok1");
  assertEquals(refreshed.patName, "n1");
  assertEquals(refreshed.patSecret, "s1");
  assertEquals(calls[0].url, "https://10ax.online.tableau.com/api/3.21/auth/signin");
});

Deno.test("revoke: signs out and never throws", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await auth.revoke!({
    credential: { baseUrl: "https://x.com", apiVersion: "3.21", token: "tok1" },
  }, ctx);
  assertEquals(calls[0].url, "https://x.com/api/3.21/auth/signout");
});
