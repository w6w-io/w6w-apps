import { assertEquals } from "@std/assert";
import service, {
  COVERED_COMPONENTS,
  mapComponentStatus,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("mapComponentStatus: maps every documented Instatus status", () => {
  assertEquals(mapComponentStatus("OPERATIONAL"), "ok");
  assertEquals(mapComponentStatus("DEGRADEDPERFORMANCE"), "degraded");
  assertEquals(mapComponentStatus("PARTIALOUTAGE"), "degraded");
  assertEquals(mapComponentStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapComponentStatus("MAJOROUTAGE"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("SOME_FUTURE_STATUS"), "unknown");
});

Deno.test("COVERED_COMPONENTS: names the components this app's actions actually depend on", () => {
  assertEquals(COVERED_COMPONENTS.has("Mollie API"), true);
  assertEquals(COVERED_COMPONENTS.has("Mollie Connect"), true);
  // A specific local payment method (e.g. iDEAL) must never drive the roll-up —
  // this app calls the gateway, not any one method directly.
  assertEquals(COVERED_COMPONENTS.has("iDEAL"), false);
});

Deno.test("check: all-operational components report ok", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      components: [
        {
          id: "grp1",
          name: "Platform availability",
          status: "OPERATIONAL",
          isParent: true,
          children: [
            { id: "c1", name: "Mollie API", status: "OPERATIONAL" },
            { id: "c2", name: "Webhook", status: "OPERATIONAL" },
          ],
        },
      ],
    },
  }]);

  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["c1"].state, "ok");
});

Deno.test("check: a degraded covered component worsens the verdict", async () => {
  const { ctx } = mockCtx([{
    body: {
      components: [
        {
          id: "grp1",
          name: "Platform availability",
          status: "OPERATIONAL",
          isParent: true,
          children: [
            { id: "c1", name: "Mollie API", status: "PARTIALOUTAGE" },
          ],
        },
      ],
    },
  }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("Mollie API"), true);
});

Deno.test("check: a component NOT in the covered set never worsens the verdict on its own", async () => {
  const { ctx } = mockCtx([{
    body: {
      components: [
        {
          id: "grp1",
          name: "Local payment methods",
          status: "OPERATIONAL",
          isParent: true,
          children: [
            { id: "c1", name: "Mollie API", status: "OPERATIONAL" },
            { id: "ideal", name: "iDEAL", status: "MAJOROUTAGE" },
          ],
        },
      ],
    },
  }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["ideal"].state, "down");
});

Deno.test("check: a non-JSON status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{
    body: "<html>oops</html>",
    headers: { "content-type": "text/html" },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check: an errored status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
