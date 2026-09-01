import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { COMPONENTS_URL, mapComponentStatus } from "../../health/service.ts";

Deno.test("mapComponentStatus: OPERATIONAL maps to ok, unrecognized statuses to degraded (never guessed as down)", () => {
  assertEquals(mapComponentStatus("OPERATIONAL"), "ok");
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("MAJOR_OUTAGE"), "degraded");
  assertEquals(mapComponentStatus("SOMETHING_NEW"), "degraded");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: declares itself scoped to the app, no credential, with its own status-host allowlist", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network, { allow: ["status.exa.ai"] });
});

Deno.test("service: check reports ok when every leaf component is OPERATIONAL", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        components: [
          {
            id: "search-api",
            name: "Search API",
            status: "OPERATIONAL",
            isParent: true,
            children: [
              { id: "people", name: "People", status: "OPERATIONAL", children: [] },
              { id: "default", name: "Default", status: "OPERATIONAL", children: [] },
            ],
          },
          { id: "websets", name: "Websets", status: "OPERATIONAL", children: [] },
          { id: "mcp", name: "Exa MCP", status: "OPERATIONAL", children: [] },
        ],
      },
    },
  ]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, COMPONENTS_URL);
  // Parent containers are flattened away — only the four real leaves are reported.
  assertEquals(Object.keys(report.components ?? {}).length, 4);
});

Deno.test("service: check reports degraded and names the affected component when one leaf isn't operational", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        components: [
          { id: "websets", name: "Websets", status: "PARTIAL_OUTAGE", children: [] },
          { id: "mcp", name: "Exa MCP", status: "OPERATIONAL", children: [] },
        ],
      },
    },
  ]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["websets"].state, "degraded");
  assertEquals(report.message?.includes("Websets"), true);
});

Deno.test("service: check reports unknown (never down) when the status API itself is broken", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "internal error" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: check reports unknown when the response carries no components", async () => {
  const { ctx } = mockCtx([{ body: { components: [] } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
