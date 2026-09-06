import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(
  components: Array<{ id: string; name: string; status: string; group_id?: string | null }>,
) {
  return { status: { indicator: "none", description: "All Systems Operational" }, components };
}

Deno.test("service: ok when all Developer API children are operational", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "g1", name: "Developer API", status: "operational", group_id: null },
      { id: "c1", name: "REST API", status: "operational", group_id: "g1" },
      { id: "c2", name: "OAuth Identity Provider", status: "operational", group_id: "g1" },
      { id: "c3", name: "Webhooks", status: "operational", group_id: "g1" },
      { id: "c4", name: "Documentation", status: "operational", group_id: "g1" },
      { id: "other", name: "Mobile", status: "major_outage", group_id: null },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["rest-api"].state, "ok");
  assertEquals(report.components?.["documentation"].state, "ok");
});

Deno.test("service: degraded when REST API reports partial_outage", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "g1", name: "Developer API", status: "operational", group_id: null },
      { id: "c1", name: "REST API", status: "partial_outage", group_id: "g1" },
      { id: "c2", name: "OAuth Identity Provider", status: "operational", group_id: "g1" },
      { id: "c3", name: "Webhooks", status: "operational", group_id: "g1" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["rest-api"].state, "degraded");
});

Deno.test("service: an unrelated component outage (Documentation) never worsens the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "g1", name: "Developer API", status: "operational", group_id: null },
      { id: "c1", name: "REST API", status: "operational", group_id: "g1" },
      { id: "c2", name: "OAuth Identity Provider", status: "operational", group_id: "g1" },
      { id: "c3", name: "Webhooks", status: "operational", group_id: "g1" },
      { id: "c4", name: "Documentation", status: "major_outage", group_id: "g1" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["documentation"].state, "down");
});

Deno.test("service: down when the OAuth Identity Provider has a major outage", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "g1", name: "Developer API", status: "operational", group_id: null },
      { id: "c1", name: "REST API", status: "operational", group_id: "g1" },
      { id: "c2", name: "OAuth Identity Provider", status: "major_outage", group_id: "g1" },
      { id: "c3", name: "Webhooks", status: "operational", group_id: "g1" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: unknown when the status page itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unknown when the Developer API group disappears from the page", async () => {
  const { ctx } = mockCtx([{
    body: summary([{ id: "x", name: "Something Else", status: "operational" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is app-scoped, unsigned, and allows only the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.patreon.com"]);
});
