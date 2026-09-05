import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/long-lived-token.ts";

Deno.test("long-lived-token: sign stamps a Bearer token, network-less", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.kommo.com/api/v4/leads",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { token: "tok123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok123");
});

Deno.test("long-lived-token: fields require the account address and the token; only the token is masked", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["accountDomain", "token"]);
  assertEquals(
    auth.fields!.filter((f) => f.type === "secret").map((f) => f.key),
    ["token"],
  );
});

/** OAuth2's redirect flow is declined, on purpose. */
Deno.test("long-lived-token: the description explains why OAuth2 is not used", () => {
  const doc = auth.description!;
  assert(doc.toLowerCase().includes("redirect") === false, doc);
  const fields = auth.fields!.map((f) => f.key);
  assert(!fields.includes("clientSecret"), "OAuth2 must not be offered by this method");
  assert(!fields.includes("redirectUri"), "OAuth2 must not be offered by this method");
});

Deno.test("long-lived-token: exchange normalises a bare subdomain to .kommo.com", () => {
  const cred = auth.exchange!(
    { fields: { accountDomain: "acme", token: "tok" } },
    mockCtx().ctx,
  ) as { accountDomain: string; token: string };
  assertEquals(cred.accountDomain, "acme.kommo.com");
  assertEquals(cred.token, "tok");
});

Deno.test("long-lived-token: exchange keeps the legacy .amocrm.com host", () => {
  const cred = auth.exchange!(
    { fields: { accountDomain: "https://acme.amocrm.com/", token: "tok" } },
    mockCtx().ctx,
  ) as { accountDomain: string };
  assertEquals(cred.accountDomain, "acme.amocrm.com");
});

Deno.test("long-lived-token: exchange requires a token", () => {
  let threw = false;
  try {
    auth.exchange!({ fields: { accountDomain: "acme", token: "" } }, mockCtx().ctx);
  } catch {
    threw = true;
  }
  assert(threw, "exchange did not reject a missing token");
});

Deno.test("long-lived-token: test passes on 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: 1, name: "Acme", subdomain: "acme" } }]);
  const result = await auth.test(
    { credential: { accountDomain: "acme.kommo.com", token: "tok" } },
    ctx,
  );
  assertEquals(result.ok, true);
});

Deno.test("long-lived-token: test reports a 401 as an expired-or-revoked token, without echoing it", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { title: "Unauthorized", detail: "Invalid user name or password" },
  }]);
  const result = await auth.test(
    { credential: { accountDomain: "acme.kommo.com", token: "secret-token-value" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("expired or been revoked"), result.message);
  assert(!result.message!.includes("secret-token-value"), "test echoed the credential");
});

Deno.test("long-lived-token: test reports 402 as the account's billing lapsing", async () => {
  const { ctx } = mockCtx([{ status: 402, body: { title: "Payment Required" } }]);
  const result = await auth.test(
    { credential: { accountDomain: "acme.kommo.com", token: "tok" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("paid or trial period"), result.message);
});

Deno.test("long-lived-token: test requires both a token and an accountDomain", async () => {
  const { ctx } = mockCtx();
  assertEquals((await auth.test({ credential: {} }, ctx)).ok, false);
  assertEquals(
    (await auth.test({ credential: { token: "tok" } }, ctx)).ok,
    false,
  );
});

Deno.test("long-lived-token: afterConnect records the account's own name and id, never the token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 42, name: "Acme Inc" } }]);
  const display = await auth.afterConnect!(
    { credential: { accountDomain: "acme.kommo.com", token: "tok" } },
    ctx,
  );
  assertEquals(display.accountDomain, "acme.kommo.com");
  assertEquals(display.accountName, "Acme Inc");
  assertEquals(display.accountId, 42);
  assert(!JSON.stringify(display).includes("tok"), "afterConnect leaked the token into display");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("long-lived-token: afterConnect degrades gracefully when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const display = await auth.afterConnect!(
    { credential: { accountDomain: "acme.kommo.com", token: "tok" } },
    ctx,
  );
  assertEquals(display, { accountDomain: "acme.kommo.com" });
});

Deno.test("long-lived-token: no revoke hook — Kommo documents no endpoint to invalidate the token", () => {
  assertEquals(auth.revoke, undefined);
});
