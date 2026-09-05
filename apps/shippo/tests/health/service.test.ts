import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const component = (
  name: string,
  status: string,
  opts: { group?: boolean; group_id?: string | null } = {},
) => ({
  id: name.toLowerCase(),
  name,
  status,
  group: opts.group ?? false,
  group_id: opts.group_id ?? null,
});

Deno.test("service: reads status.goshippo.com, not the API host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { components: [component("Shippo REST API", "operational")] },
  }]);
  await service.check!({}, ctx);
  assertEquals(new URL(calls[0].url).hostname, "status.goshippo.com");
});

Deno.test("service: all own services operational and no carrier issues reads ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("Shippo REST API", "operational"),
        component("Shippo Web Dashboard", "operational"),
        component("Shippo Platform API", "operational"),
        component("Carrier API", "operational", { group: true }),
        component("USPS", "operational", { group_id: "carrier-api" }),
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(/3 services operational/.test(report.message!), report.message);
});

/**
 * Verified live 2026-09-05: FedEx and its "Carrier API" parent both read
 * `partial_outage` while every Shippo-owned component reads `operational` —
 * exactly the case this split exists for.
 */
Deno.test("service: a carrier outage is reported by name and does not sink the verdict", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("Shippo REST API", "operational"),
        component("Shippo Web Dashboard", "operational"),
        component("Carrier API", "partial_outage", { group: true }),
        component("FedEx", "partial_outage", { group_id: "carrier-api" }),
        component("USPS", "operational", { group_id: "carrier-api" }),
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(/FedEx/.test(report.message!), report.message);
  assert(/Shippo itself is unaffected/.test(report.message!), report.message);
});

Deno.test("service: Shippo's own service being down degrades the verdict", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("Shippo REST API", "major_outage"),
        component("Shippo Web Dashboard", "operational"),
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/Shippo REST API: major_outage/.test(report.message!), report.message);
});

/** A status page that itself fails says nothing about the vendor. */
Deno.test("service: a failing status page reads unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: an unexpected shape reads unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { nope: true } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: declares only the status host, not the API host", () => {
  assertEquals(service.network, { allow: ["status.goshippo.com"] });
  assertEquals(service.kind, "service");
});
