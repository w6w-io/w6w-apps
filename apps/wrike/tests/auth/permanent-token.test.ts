import { assert, assertEquals } from "@std/assert";
import permanentToken from "../../auth/permanent-token.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("permanent-token: sign injects the bearer header and nothing else", async () => {
  const request = { url: "https://www.wrike.com/api/v4/version", method: "GET", headers: {} };
  const out = await permanentToken.sign!(
    { request, credential: { token: "secret-token", host: "www.wrike.com" } },
    mockCtx().ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer secret-token");
});

Deno.test("permanent-token: test probes /version and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ major: 4, minor: 0 }] } }]);
  const result = await permanentToken.test(
    { credential: { token: "t", host: "www.wrike.com" } },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), "/api/v4/version");
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

Deno.test("permanent-token: test reports a readable message on 401", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("not_authorized", "Access token is unknown or invalid") },
  ]);
  const result = await permanentToken.test(
    { credential: { token: "bad", host: "www.wrike.com" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("permanent-token: test fails closed on a missing token or host", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(
    (await permanentToken.test({ credential: { host: "www.wrike.com" } }, ctx)).ok,
    false,
  );
  assertEquals((await permanentToken.test({ credential: { token: "t" } }, ctx)).ok, false);
  assertEquals(calls.length, 0, "a missing field must not reach the network");
});

Deno.test("permanent-token: afterConnect records the host and the requesting user's name", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: envelope([{ id: "KUAJ25LC", firstName: "Test", lastName: "User", me: true }]),
    },
  ]);
  const display = await permanentToken.afterConnect!(
    { credential: { token: "t", host: "app-eu.wrike.com" } },
    ctx,
  );
  assertEquals(display, { host: "app-eu.wrike.com", name: "Test User", contactId: "KUAJ25LC" });
  assertEquals(pathOf(calls[0].url), "/api/v4/contacts");
  assertEquals(new URL(calls[0].url).searchParams.get("me"), "true");
});

Deno.test("permanent-token: afterConnect degrades gracefully when the contact read fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("server_error", "boom") }]);
  const display = await permanentToken.afterConnect!(
    { credential: { token: "t", host: "www.wrike.com" } },
    ctx,
  );
  assertEquals(display, { host: "www.wrike.com" });
});

Deno.test("permanent-token: declares a secret token field and a non-secret host field", () => {
  const tokenField = permanentToken.fields?.find((f) => f.key === "token");
  const hostField = permanentToken.fields?.find((f) => f.key === "host");
  assertEquals(tokenField?.type, "secret");
  assertEquals(hostField?.type, "select");
  assert(hostField?.type !== "secret");
});
