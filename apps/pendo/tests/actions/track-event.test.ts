import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track-event.ts";

Deno.test("track-event: posts to the data host with the track body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({
    event: "Registered",
    visitorId: "visitor-1",
    accountId: "account-1",
    timestamp: Date.now(),
  }, ctx) as { sent: boolean; deferred: boolean };

  assertEquals(calls[0].url, "https://data.pendo.io/data/track");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "track");
  assertEquals(body.event, "Registered");
  assertEquals(body.visitorId, "visitor-1");
  assertEquals(body.accountId, "account-1");
  assertEquals(result.sent, true);
  assertEquals(result.deferred, false);
});

Deno.test("track-event: uses the current time when no timestamp is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const before = Date.now();
  await action.execute!({ event: "e", visitorId: "v" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(body.timestamp >= before);
});

Deno.test("track-event: `event` and `visitorId` are required", async () => {
  await assertRejects(
    async () => await action.execute!({ visitorId: "v" }, mockCtx([]).ctx),
    Error,
    "`event` is required",
  );
  await assertRejects(
    async () => await action.execute!({ event: "e" }, mockCtx([]).ctx),
    Error,
    "`visitorId` is required",
  );
});

/** A timestamp in the past is silently deferred by Pendo — this action warns instead. */
Deno.test("track-event: a stale timestamp is flagged as deferred and logs a warning", async () => {
  const { ctx, logs } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({
    event: "e",
    visitorId: "v",
    timestamp: Date.now() - 60 * 60 * 1000,
  }, ctx) as { deferred: boolean };
  assertEquals(result.deferred, true);
  assert(logs.some((l) => l.level === "warn" && /daily\/weekly reprocessing/.test(l.message)));
});

Deno.test("track-event: a timestamp over 7 days old warns about possibly not being processed", async () => {
  const { ctx, logs } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({
    event: "e",
    visitorId: "v",
    timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
  }, ctx) as { deferred: boolean };
  assertEquals(result.deferred, true);
  assert(logs.some((l) => l.level === "warn" && /may not process it at all/.test(l.message)));
});

Deno.test("track-event: properties and context are parsed JSON, passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute!({
    event: "e",
    visitorId: "v",
    properties: JSON.stringify({ plan: "pro" }),
    context: JSON.stringify({ ip: "1.2.3.4" }),
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties, { plan: "pro" });
  assertEquals(body.context, { ip: "1.2.3.4" });
});

Deno.test("track-event: a non-2xx response throws with Pendo's own detail", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "bad request" }]);
  await assertRejects(
    async () => await action.execute!({ event: "e", visitorId: "v" }, ctx),
    Error,
    "bad request",
  );
});
