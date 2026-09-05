import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const SUMMARY = {
  components: [
    {
      id: "grp-na1",
      name: "AMERICAS - CLOUD 1 (NA1) - *.na.zuora.com",
      group: true,
      group_id: null,
    },
    { id: "api-na1", name: "Production API", group_id: "grp-na1", status: "operational" },
    {
      id: "grp-na2",
      name: "AMERICAS - CLOUD 2 (NA2) - www|rest.zuora.com",
      group: true,
      group_id: null,
    },
    { id: "api-na2", name: "Production API", group_id: "grp-na2", status: "major_outage" },
  ],
};

Deno.test("service: reads only the connection's own region group", async () => {
  const { ctx } = mockCtx([{ status: 200, body: SUMMARY }], { display: { region: "us-cloud1" } });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: an outage in a DIFFERENT region's group does not turn this connection down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: SUMMARY }], { display: { region: "us-cloud1" } });
  const report = await service.check!({}, ctx);
  // us-cloud1 -> NA1 group, which is operational even though NA2 is a major outage.
  assertEquals(report.state, "ok");
});

Deno.test("service: an outage in THIS connection's own group is reported down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: SUMMARY }], { display: { region: "us-cloud2" } });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }], { display: { region: "us-cloud2" } });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: never sends a credential — the status host must never see one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: SUMMARY }], {
    display: { region: "us-cloud2" },
  });
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://zuora.statuspage.io/api/v2/components.json");
  assertEquals(calls[0].headers["authorization"], undefined);
});
