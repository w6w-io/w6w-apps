import { assertEquals, assertRejects } from "@std/assert";
import monitorCreate from "../../actions/monitor-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

const MONITOR = { id: "m1", name: "Monitor Products", status: "active", createdAt: 1 };

Deno.test("monitor-create: POSTs the full body, sending `schedule` not the deprecated `schedules`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("monitor", MONITOR) }]);
  const out = await monitorCreate.execute({
    robotId: "r1",
    name: "Monitor Products",
    inputParameters: { originUrl: "https://a.example" },
    schedule: "FREQ=HOURLY;INTERVAL=1",
    notifyOnCapturedScreenshotChange: true,
    notifyOnCapturedTextChange: true,
    capturedScreenshotNotificationThreshold: 15,
  }, ctx) as typeof MONITOR;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/monitors");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Monitor Products");
  assertEquals(body.inputParameters, { originUrl: "https://a.example" });
  assertEquals(body.schedule, "FREQ=HOURLY;INTERVAL=1");
  assertEquals("schedules" in body, false);
  assertEquals(out.id, "m1");
});

Deno.test("monitor-create: missing inputParameters fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await monitorCreate.execute({
        robotId: "r1",
        name: "x",
        inputParameters: undefined,
        notifyOnCapturedScreenshotChange: true,
        notifyOnCapturedTextChange: true,
        capturedScreenshotNotificationThreshold: 15,
      }, ctx),
    Error,
    "Input parameters is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("monitor-create: is declared non-idempotent — each call adds a new monitor", () => {
  assertEquals(monitorCreate.idempotent, false);
});

Deno.test("monitor-create: inputParameters is required in the param declaration", () => {
  const p = monitorCreate.params?.find((p) => p.key === "inputParameters");
  assertEquals(p?.required, true);
});
