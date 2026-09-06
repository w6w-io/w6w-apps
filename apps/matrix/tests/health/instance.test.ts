import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";

const conn = { display: { homeserverUrl: "https://matrix.example.org" } };

Deno.test("instance: probes this connection's own /_matrix/client/versions, unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { versions: ["v1.11", "v1.12"] } }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(calls[0].url, "https://matrix.example.org/_matrix/client/versions");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "speaks v1.11, v1.12");
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  // Unsigned: an expired token must not make the homeserver look down.
  assertEquals(instance.credential, "context");
});

Deno.test("instance: an unreachable homeserver is down", async () => {
  const { ctx } = mockCtx([], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"), report.message);
});

/** A 404 here means something answered, but it is not this endpoint. */
Deno.test("instance: a 404 is diagnosed as a wrong homeserver URL", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("is the homeserver URL right?"), report.message);
});

Deno.test("instance: another status is down, and a body with no versions[] is degraded", async () => {
  const bad = mockCtx([{ status: 502, body: "" }], conn);
  assertEquals((await instance.check!({}, bad.ctx)).state, "down");

  const odd = mockCtx([{ status: 200, body: { nope: true } }], conn);
  assertEquals((await instance.check!({}, odd.ctx)).state, "degraded");

  const empty = mockCtx([{ status: 200, body: { versions: [] } }], conn);
  assertEquals((await instance.check!({}, empty.ctx)).state, "degraded");
});

Deno.test("instance: a connection with no homeserver URL is unknown, not down", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("records no homeserver URL"), report.message);
});
