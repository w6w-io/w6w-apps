import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

const IDENTITY_URL = "https://api.freshbooks.com/auth/api/v1/users/me";

Deno.test("oauth2: endpoints and scopes verified against the FreshBooks reference", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://auth.freshbooks.com/oauth/authorize/");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.freshbooks.com/auth/oauth/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://api.freshbooks.com/auth/oauth/token");
  assertEquals(auth.oauth2?.revokeUrl, "https://api.freshbooks.com/auth/oauth/revoke");
  assertEquals(auth.oauth2?.pkce, false);
  assert(auth.oauth2?.scopes?.includes("user:profile:read"));
  assert(auth.oauth2?.scopes?.includes("user:invoices:read"));
  assert(auth.oauth2?.scopes?.includes("user:invoices:write"));
  assert(auth.oauth2?.scopes?.includes("user:time_entries:write"));
});

Deno.test("sign: stamps Authorization only — accountId/businessId are path segments, not headers", async () => {
  const request = {
    url: "https://api.freshbooks.com/accounting/account/acc1/users/clients",
    method: "GET",
    headers: {},
  };
  const signed = await auth.sign!({ request, credential: { accessToken: "tok" } }, {} as never);
  assertEquals(signed.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test rejects a response with no identity id", async () => {
  const { ctx, calls } = mockCtx([{ body: { response: {} } }]);
  assertEquals(await auth.test({ credential: { accessToken: "tok" } }, ctx), {
    ok: false,
    message: "FreshBooks identity response missing an id",
  });
  assertEquals(calls[0].url, IDENTITY_URL);
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
  assertEquals(calls[0].headers["api-version"], "alpha");
});

Deno.test("oauth2: test accepts a response with an identity id", async () => {
  const { ctx } = mockCtx([{ body: { response: { id: 712052 } } }]);
  assertEquals(await auth.test({ credential: { accessToken: "tok" } }, ctx), { ok: true });
});

Deno.test("oauth2: test rejects a missing accessToken without calling the network", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect prefers the owner-role membership with an account id", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      response: {
        id: 712052,
        email: "b@example.com",
        business_memberships: [
          { id: 1, role: "client", business: { id: 999, name: "Some Client Biz" } },
          {
            id: 2,
            role: "owner",
            business: { id: 77128, name: "BillSpring", account_id: "zDmNq" },
          },
        ],
      },
    },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.accountId, "zDmNq");
  assertEquals(out.businessId, "77128");
  assertEquals(out.businessName, "BillSpring");
  assertEquals(out.userId, 712052);
  assertEquals(out.email, "b@example.com");
  assertEquals(calls[0].url, IDENTITY_URL);
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: afterConnect falls back to the first membership when none is an owner", async () => {
  const { ctx } = mockCtx([{
    body: {
      response: {
        id: 1,
        business_memberships: [
          { id: 1, role: "client", business: { id: 500, name: "Only Business" } },
        ],
      },
    },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.businessId, "500");
  assertEquals(out.accountId, undefined);
});

Deno.test("oauth2: afterConnect degrades to {} when there are no business memberships", async () => {
  const { ctx } = mockCtx([{ body: { response: { id: 1, business_memberships: [] } } }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx), {});
});
