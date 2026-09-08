import { assertEquals } from "@std/assert";
import auth from "../../auth/personal-token.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("personal-token: sign stamps Authorization: Bearer", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://moneybird.com/api/v2/123/contacts.json",
    method: "GET",
    headers: {},
  };
  const signed = await auth.sign!({ request, credential: { apiToken: "tok" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok");
});

Deno.test("personal-token: test rejects a missing credential without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.test({ credential: {} }, ctx);
  assertEquals(out, { ok: false, message: "credential missing apiToken" });
  assertEquals(calls.length, 0);
});

Deno.test("personal-token: test accepts a token that reaches at least one administration", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "123", name: "Acme" }] }]);
  const out = await auth.test({ credential: { apiToken: "tok" } }, ctx);
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, "https://moneybird.com/api/v2/administrations.json");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("personal-token: test rejects a token that reaches no administration", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const out = await auth.test({ credential: { apiToken: "tok" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("reaches no administration"), true);
});

Deno.test("personal-token: test surfaces a formatted error on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "invalid token" } }]);
  const out = await auth.test({ credential: { apiToken: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("invalid token"), true);
});

Deno.test("personal-token: afterConnect resolves the FIRST administration", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      { id: 123, name: "Acme B.V." },
      { id: 456, name: "Acme Holdings" },
    ],
  }]);
  const out = await auth.afterConnect!({ credential: { apiToken: "tok" } }, ctx);
  assertEquals(out.administrationId, "123");
  assertEquals(out.administrationName, "Acme B.V.");
  assertEquals(out.administrations, [
    { id: "123", name: "Acme B.V." },
    { id: "456", name: "Acme Holdings" },
  ]);
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("personal-token: afterConnect degrades to {} when no administration is accessible", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await auth.afterConnect!({ credential: { apiToken: "tok" } }, ctx), {});
});

Deno.test("personal-token: the credential field is declared secret", () => {
  assertEquals(auth.key, "personal-token");
  assertEquals(auth.type, "bearer");
  for (const f of auth.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
