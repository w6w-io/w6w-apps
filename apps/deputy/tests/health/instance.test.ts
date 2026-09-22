import { assertEquals } from "@std/assert";
import instance from "../../health/instance.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("check: the documented 403 'No authorization given' envelope means reachable", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 403, body: { error: { code: 403, message: "No authorization given" } } }],
    { display: { baseUrl: BASE_URL } },
  );
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/me`);
  // Unsigned — no credential sent, so a revoked token can never make this look down.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("check: an unreachable install is down", async () => {
  const { ctx } = mockCtx([], { display: { baseUrl: BASE_URL } });
  // mockCtx throws when the queue is empty, simulating a network failure the
  // client sees as a fetch rejection.
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("check: a redirect off the install (typo'd URL) reports down with a clear reason", async () => {
  const { ctx } = mockCtx(
    [{
      status: 200,
      body: "<html>login</html>",
      headers: { "content-type": "text/html" },
      url: "https://once.deputy.com/my/",
    }],
    { display: { baseUrl: "https://not-an-install.au.deputy.com" } },
  );
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "down");
  assertEquals(/Once login|redirected/i.test(result.message ?? ""), true);
});

Deno.test("check: a 200 JSON body (no auth required posture) is still ok", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { message: "unexpected but reachable" } }],
    { display: { baseUrl: BASE_URL } },
  );
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("check: an unparseable connection (missing baseUrl) reports unknown", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("manifest shape: connection-scoped dependency check, unsigned but context-aware", () => {
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  assertEquals(instance.credential, "context");
});
