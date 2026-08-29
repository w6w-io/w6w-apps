import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

/** The key is the username and the password is EMPTY — a trailing colon. */
Deno.test("api-key: sign sends Basic auth with an empty password", () => {
  const request = { url: "https://onfleet.com/api/v2/tasks/all", method: "GET", headers: {} };
  const signed = auth.sign!({ request, credential: { apiKey: "ofk_1" } }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(atob(signed.headers["authorization"].slice(6)), "ofk_1:");
});

/** `/auth/test` names the organization and the caller's IP, never the key. */
Deno.test("api-key: test hits /auth/test and reports Onfleet's own message", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { message: "Hello organization 'acme' hitting Onfleet from 1.2.3.4" },
  }]);
  const result = await auth.test!({ credential: { apiKey: "ofk_1" } }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/auth/test");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("ofk_1:")}`);
  assertEquals(result.ok, true);
  assert(/Hello organization/.test(result.message!), result.message);
});

Deno.test("api-key: a rejected key is reported without echoing it", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "InvalidCredentials", message: { error: 1102, message: "invalid" } },
  }]);
  const result = await auth.test!({ credential: { apiKey: "ofk_secret" } }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected/.test(result.message!), result.message);
  assert(!result.message!.includes("ofk_secret"), result.message);
});

Deno.test("api-key: any other failure reports the status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await auth.test!({ credential: { apiKey: "ofk_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("503"), result.message);
});

Deno.test("api-key: a missing credential is refused before a request is made", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a network failure is reported, not thrown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("network down")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: { apiKey: "ofk_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/could not reach Onfleet/.test(result.message!), result.message);
});

Deno.test("api-key: is basic auth with one secret field", () => {
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields!.map((f) => f.key), ["apiKey"]);
  assertEquals(auth.fields![0].type, "secret");
  assertEquals(auth.fields![0].required, true);
});
