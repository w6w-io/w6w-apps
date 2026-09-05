import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function components(overrides: Record<string, unknown> = {}) {
  return {
    components: [
      {
        id: "app-editing",
        name: "App Editing",
        status: "OPERATIONAL",
        isParent: true,
        children: [
          { id: "app-editor", name: "App Editor", status: "OPERATIONAL", children: [] },
        ],
      },
      {
        id: "published-apps",
        name: "Published Apps",
        status: "OPERATIONAL",
        isParent: true,
        children: [
          { id: "collections", name: "Collections", status: "OPERATIONAL", children: [] },
        ],
      },
      {
        id: "collections-api",
        name: "Collections API",
        status: "OPERATIONAL",
        isParent: false,
        children: [],
      },
    ],
    ...overrides,
  };
}

Deno.test("service: declares the status.adalo.com allowlist and app scope", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.adalo.com"]);
});

Deno.test("service: an operational Collections API component reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: components() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(
    new URL(calls[0].url).toString(),
    "https://status.adalo.com/api/v2/components.json",
  );
});

Deno.test("service: a degraded Collections API component reports degraded", async () => {
  const body = components();
  body.components[2].status = "PARTIAL_OUTAGE";
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a major outage on Collections API reports down", async () => {
  const body = components();
  body.components[2].status = "MAJOR_OUTAGE";
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

/**
 * The finding this check exists for: `App Editing` and `Publishing` being
 * down must not report the Collections API as down — they are a different
 * product surface (the Adalo builder itself), and this app never calls it.
 */
Deno.test("service: an outage in App Editing does NOT affect the Collections API verdict", async () => {
  const body = components();
  body.components[0].status = "MAJOR_OUTAGE";
  (body.components[0].children as Array<Record<string, unknown>>)[0].status = "MAJOR_OUTAGE";
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: an unrecognized status string reports unknown", async () => {
  const body = components();
  body.components[2].status = "SOMETHING_NEW";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page with no Collections API component reports unknown", async () => {
  const body = components();
  body.components = body.components.filter((c) => c.id !== "collections-api");
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
