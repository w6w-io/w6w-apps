import { assert, assertEquals } from "@std/assert";
import monitorList from "../../actions/monitor-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The response is a bare array with no envelope — unlike every v2 endpoint here
 * — so the action wraps it to give the step a stable output shape.
 */
Deno.test("monitor-list: unwraps Datadog's bare array into a named field", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const out = await monitorList.execute({ page: 0, pageSize: 100 }, ctx) as {
    monitors: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/api/v1/monitor");
  assertEquals(out.monitors, [{ id: 1 }, { id: 2 }]);
});

/**
 * Datadog's own wording: without `page` the endpoint "returns all monitors
 * without pagination". Prefilling it turns an unbounded default into a page.
 */
Deno.test("monitor-list: page and page size are prefilled against the unbounded default", () => {
  assertEquals(monitorList.params?.find((p) => p.key === "page")?.default, 0);
  assertEquals(monitorList.params?.find((p) => p.key === "pageSize")?.default, 100);
  const hint = monitorList.params?.find((p) => p.key === "page")?.hint ?? "";
  assert(hint.includes("every"), hint);
});

Deno.test("monitor-list: scope tags and monitor tags are separate parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await monitorList.execute({ tags: "host:host0", monitorTags: "service:web", page: 0 }, ctx);
  assertEquals(queryOf(calls[0].url), {
    tags: "host:host0",
    monitor_tags: "service:web",
    page: "0",
  });
});

Deno.test("monitor-list: booleans are sent only when true", async () => {
  const on = mockCtx([{ body: [] }]);
  await monitorList.execute({ withDowntimes: true }, on.ctx);
  assertEquals(queryOf(on.calls[0].url).with_downtimes, "true");

  const off = mockCtx([{ body: [] }]);
  await monitorList.execute({ withDowntimes: false }, off.ctx);
  assertEquals("with_downtimes" in queryOf(off.calls[0].url), false);
});

Deno.test("monitor-list: an empty response yields an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals((await monitorList.execute({}, ctx) as { monitors: unknown[] }).monitors, []);
});
