import { assert, assertEquals, assertRejects } from "@std/assert";
import downtimeSchedule from "../../actions/downtime-schedule.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

interface Body {
  data: { type: string; attributes: Record<string, unknown> };
}

Deno.test("downtime-schedule: POSTs a JSON:API document to /api/v2/downtime", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "d-1" } } }]);
  const out = await downtimeSchedule.execute(
    {
      scope: "env:staging",
      monitorId: 42,
      start: "2026-08-11T07:00:00Z",
      end: "2026-08-11T08:00:00Z",
    },
    ctx,
  ) as { id?: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/downtime");
  const body = bodyOf(calls[0]) as unknown as Body;
  assertEquals(body.data.type, "downtime");
  assertEquals(body.data.attributes.scope, "env:staging");
  assertEquals(body.data.attributes.monitor_identifier, { monitor_id: 42 });
  assertEquals(body.data.attributes.schedule, {
    start: "2026-08-11T07:00:00Z",
    end: "2026-08-11T08:00:00Z",
  });
  assertEquals(out.id, "d-1");
});

/**
 * `monitor_identifier` is required and is a `oneOf`. Omitting it is a 400, so
 * the action always sends one — and Datadog's documented spelling for "every
 * monitor in this scope" is `monitor_tags: ["*"]`.
 */
Deno.test("downtime-schedule: a monitor identifier is always sent, defaulting to all", async () => {
  const bare = mockCtx([{ body: { data: {} } }]);
  await downtimeSchedule.execute({ scope: "env:staging" }, bare.ctx);
  assertEquals(
    (bodyOf(bare.calls[0]) as unknown as Body).data.attributes.monitor_identifier,
    { monitor_tags: ["*"] },
  );

  const tagged = mockCtx([{ body: { data: {} } }]);
  await downtimeSchedule.execute(
    { scope: "env:staging", monitorTags: "team:payments, service:checkout" },
    tagged.ctx,
  );
  assertEquals(
    (bodyOf(tagged.calls[0]) as unknown as Body).data.attributes.monitor_identifier,
    { monitor_tags: ["team:payments", "service:checkout"] },
  );
});

/** A specific monitor wins over tags — they are alternatives, not a union. */
Deno.test("downtime-schedule: a monitor id overrides monitor tags", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await downtimeSchedule.execute({ scope: "*", monitorId: 7, monitorTags: "a:b" }, ctx);
  assertEquals(
    (bodyOf(calls[0]) as unknown as Body).data.attributes.monitor_identifier,
    { monitor_id: 7 },
  );
});

Deno.test("downtime-schedule: no schedule is sent when neither start nor end is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await downtimeSchedule.execute({ scope: "*" }, ctx);
  assertEquals("schedule" in (bodyOf(calls[0]) as unknown as Body).data.attributes, false);
});

Deno.test("downtime-schedule: a start with no end is sent as an open-ended window", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await downtimeSchedule.execute({ scope: "*", start: "2026-08-11T07:00:00Z" }, ctx);
  assertEquals(
    (bodyOf(calls[0]) as unknown as Body).data.attributes.schedule,
    { start: "2026-08-11T07:00:00Z" },
  );
});

Deno.test("downtime-schedule: a non-integer monitor id is refused before anything is sent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(downtimeSchedule.execute({ scope: "*", monitorId: "abc" }, ctx)),
    Error,
    "whole number",
  );
  assertEquals(calls.length, 0);
});

/**
 * Two hints carry facts that are otherwise invisible until production is quiet:
 * Datadog rejects a non-zero UTC offset, and an empty End means forever.
 */
Deno.test("downtime-schedule: the window hints state the UTC-offset and forever rules", () => {
  const start = downtimeSchedule.params?.find((p) => p.key === "start")?.hint ?? "";
  const end = downtimeSchedule.params?.find((p) => p.key === "end")?.hint ?? "";
  assert(start.includes("zero UTC offset"), start);
  assert(end.includes("never ends"), end);
});

Deno.test("downtime-schedule: it is a non-idempotent perform", () => {
  assertEquals(downtimeSchedule.type, "perform");
  assertEquals(downtimeSchedule.idempotent, false);
});
