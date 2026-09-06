import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/oauth2.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("oauth2: declares the vendor's own authorize/token/revoke URLs", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://moneybird.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://moneybird.com/oauth/token");
  assertEquals(auth.oauth2?.revokeUrl, "https://moneybird.com/oauth/revoke");
  assert(auth.oauth2?.scopes?.includes("sales_invoices"));
});

Deno.test("oauth2: sign stamps Authorization: Bearer", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://moneybird.com/api/v2/123/contacts.json",
    method: "GET",
    headers: {},
  };
  const signed = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test accepts a token that reaches at least one administration", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "123", name: "Acme" }] }]);
  assertEquals(await auth.test({ credential: { accessToken: "tok" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://moneybird.com/api/v2/administrations.json");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test rejects a token that reaches no administration", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const out = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("reaches no administration"), true);
});

Deno.test("oauth2: afterConnect resolves the FIRST administration", async () => {
  const { ctx } = mockCtx([{
    body: [{ id: "123", name: "Acme B.V." }, { id: "456", name: "Other" }],
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.administrationId, "123");
  assertEquals(out.administrationName, "Acme B.V.");
});

Deno.test("oauth2: afterConnect degrades to {} when no administration is accessible", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx), {});
});
