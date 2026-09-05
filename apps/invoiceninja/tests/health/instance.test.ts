import { assertEquals } from "@std/assert";
import instance from "../../health/instance.ts";
import { mockCtx, mockNinjaCtx } from "../_helpers.ts";

Deno.test("instance: is a connection-scoped dependency check, signed by default", () => {
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  assertEquals(instance.credential, undefined); // `signed` is this kind's default
  assertEquals(instance.network, undefined);
});

Deno.test("instance: unknown when the connection records no instance URL", async () => {
  const { ctx } = mockCtx();
  assertEquals((await instance.check!({}, ctx)).state, "unknown");
});

Deno.test("instance: a 403 (bad/missing token) is unknown, deferring to the auth check", async () => {
  const { ctx } = mockNinjaCtx([{ status: 403, body: { message: "Invalid token" } }]);
  assertEquals((await instance.check!({}, ctx)).state, "unknown");
});

Deno.test("instance: system_health true with no failed jobs is ok", async () => {
  const { ctx, calls } = mockNinjaCtx([{
    body: { system_health: true, queue_data: { failed: 0 }, pending_migrations: false },
  }]);
  const r = await instance.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/health_check");
});

Deno.test("instance: system_health false is down", async () => {
  const { ctx } = mockNinjaCtx([{ body: { system_health: false } }]);
  assertEquals((await instance.check!({}, ctx)).state, "down");
});

Deno.test("instance: failed queue jobs are degraded, not down", async () => {
  const { ctx } = mockNinjaCtx([{
    body: { system_health: true, queue_data: { failed: 2, last_error: "boom" } },
  }]);
  const r = await instance.check!({}, ctx);
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "2 failed queue job(s): boom");
});

Deno.test("instance: pending migrations are degraded", async () => {
  const { ctx } = mockNinjaCtx([{
    body: { system_health: true, queue_data: { failed: 0 }, pending_migrations: true },
  }]);
  assertEquals((await instance.check!({}, ctx)).state, "degraded");
});

Deno.test("instance: a 5xx is down", async () => {
  const { ctx } = mockNinjaCtx([{ status: 502, body: "" }]);
  assertEquals((await instance.check!({}, ctx)).state, "down");
});
