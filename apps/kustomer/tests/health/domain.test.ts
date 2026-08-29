import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import domain from "../../health/domain.ts";

Deno.test("domain: declares itself context-credentialed and connection-scoped", () => {
  assertEquals(domain.kind, "dependency");
  assertEquals(domain.scope, "connection");
  assertEquals(domain.credential, "context");
});

Deno.test("domain: unknown when the connection records no org subdomain", async () => {
  const { ctx } = mockKustomerCtx([], "acme");
  (ctx.connection as { display?: unknown }).display = {};
  const out = await domain.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("domain: a 401 counts as reachable — this check is unauthenticated by design", async () => {
  const { ctx, calls } = mockKustomerCtx([{ status: 401, body: { errors: [] } }]);
  const out = await domain.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("domain: a 200 counts as reachable", async () => {
  const { ctx } = mockKustomerCtx([{ body: { data: { id: "1" } } }]);
  const out = await domain.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("domain: a 404 means the org host is gone", async () => {
  const { ctx } = mockKustomerCtx([{ status: 404, body: {} }]);
  const out = await domain.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("domain: a 5xx means the org host is down", async () => {
  const { ctx } = mockKustomerCtx([{ status: 500, body: {} }]);
  const out = await domain.check!({}, ctx);
  assertEquals(out.state, "down");
});
