import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: declares kind service, app scope, and its own status-host allowlist", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  assertEquals(service.network, { allow: ["status.cognitoforms.com"] });
});

Deno.test("service: maps a clean Statuspage summary to ok with per-component detail", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [
          { name: "Website and Forms", status: "operational", group: false },
          { name: "Email", status: "operational", group: false },
          { name: "Everything", status: "operational", group: true },
        ],
      },
    },
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/summary.json");
  assertEquals(result.state, "ok");
  assertEquals(result.components, {
    "website-and-forms": { state: "ok" },
    "email": { state: "ok" },
  });
});

Deno.test("service: a major incident maps to down and carries the description", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        status: { indicator: "major", description: "Partial system outage" },
        components: [{ name: "Website and Forms", status: "major_outage" }],
      },
    },
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assertEquals(result.message, "Partial system outage");
});

Deno.test("service: an unreachable status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});
