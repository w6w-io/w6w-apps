import { assertEquals } from "@std/assert";
import lines from "../../health/lines.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lines: all lines ONLINE reports ok with per-number components", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        data: [
          { sendblue_number: "+15550001111", status: "ONLINE", assignment: "assigned" },
          { sendblue_number: "+15550002222", status: "ONLINE", assignment: "shared" },
        ],
        snapshot_at: "2026-08-25T00:00:00.000Z",
      },
    },
  ]);
  const report = await lines.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/lines/state");
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["+15550001111"].state, "ok");
  assertEquals(report.components?.["+15550002222"].state, "ok");
});

Deno.test("lines: one OFFLINE line drags the whole report down, others stay unaffected", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        data: [
          { sendblue_number: "+15550001111", status: "ONLINE", assignment: "assigned" },
          { sendblue_number: "+15550002222", status: "OFFLINE", assignment: "grace_period" },
        ],
      },
    },
  ]);
  const report = await lines.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.components?.["+15550001111"].state, "ok");
  assertEquals(report.components?.["+15550002222"].state, "down");
});

Deno.test("lines: DEGRADED reports degraded, not down", async () => {
  const { ctx } = mockCtx([{ body: { data: [{ sendblue_number: "+1", status: "DEGRADED" }] } }]);
  const report = await lines.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("lines: no assigned lines reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ body: { data: [] } }]);
  const report = await lines.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("lines: a broken endpoint reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await lines.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
