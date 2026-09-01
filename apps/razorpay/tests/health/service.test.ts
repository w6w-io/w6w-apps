import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  COVERED_SERVICES,
  mapServiceStatus,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Shaped from the live response measured 2026-09-01 (5,381 bytes, 7 services). */
function services(overrides: Partial<Record<string, unknown>>[] = []) {
  const base = [
    { id: 20, name: "Payments API", permalink: "payments-api", online: true, online_24_hours: 100 },
    { id: 19, name: "Checkout", permalink: "checkout", online: true, online_24_hours: 100 },
    { id: 18, name: "Dashboard", permalink: "dashboard", online: true, online_24_hours: 100 },
    { id: 21, name: "Payment Link", permalink: "payment-link", online: true, online_24_hours: 100 },
    {
      id: 27,
      name: "RazorpayX Payouts",
      permalink: "razorpayx-payouts",
      online: true,
      online_24_hours: 100,
    },
  ];
  return overrides.length ? overrides : base;
}

Deno.test("service: probes the status host's real feed, not the Statuspage-shaped decoy", () => {
  assertEquals(STATUS_URL, "https://status.razorpay.com/api/services");
  assertEquals(service.network?.allow, ["status.razorpay.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: all covered services online reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: services() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, undefined);
});

Deno.test("service: every listed service is reported as a component, not just the covered ones", async () => {
  const { ctx } = mockCtx([{ body: services() }]);
  const report = await service.check!({}, ctx);

  assertEquals(Object.keys(report.components ?? {}).length, 5);
  assertEquals(report.components?.["razorpayx-payouts"]?.state, "ok");
});

/**
 * The RazorpayX components must not drive the verdict — this app never
 * calls that product.
 */
Deno.test("service: an unrelated RazorpayX outage does not worsen the verdict", async () => {
  const svcs = services();
  const payouts = svcs.find((s) => s.name === "RazorpayX Payouts")!;
  payouts.online = false;

  const { ctx } = mockCtx([{ body: svcs }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.components?.["razorpayx-payouts"]?.state, "down");
});

Deno.test("service: Payments API going offline reports down and names the affected component", async () => {
  const svcs = services();
  const payments = svcs.find((s) => s.name === "Payments API")!;
  payments.online = false;

  const { ctx } = mockCtx([{ body: svcs }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/Payments API \(offline\)/.test(report.message ?? ""), report.message);
});

Deno.test("service: online but a rough 24h reports degraded, not ok", async () => {
  const svcs = services();
  const checkout = svcs.find((s) => s.name === "Checkout")!;
  checkout.online_24_hours = 92;

  const { ctx } = mockCtx([{ body: svcs }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
});

/** A broken status API says nothing about Razorpay — never `down`. */
Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/**
 * The decoy: every Statuspage-shaped `/api/v2/*.json` path (and any garbage
 * path under `/api/`) answers 200 with an HTML shell. A non-JSON content
 * type is the tell.
 */
Deno.test("service: an HTML body (the decoy shape) reports unknown, not a parse crash", async () => {
  const { ctx } = mockCtx([
    {
      body: "<!DOCTYPE html><html>...</html>",
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/text\/html/.test(report.message ?? ""), report.message);
});

Deno.test("service: an empty array reports unknown", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a feed missing every covered service name reports unknown", async () => {
  const { ctx } = mockCtx([{ body: [{ id: 1, name: "Something Else", online: true }] }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("mapServiceStatus: online + full 24h uptime is ok; offline is down; partial 24h is degraded", () => {
  assertEquals(mapServiceStatus(true, 100), "ok");
  assertEquals(mapServiceStatus(true, 95), "degraded");
  assertEquals(mapServiceStatus(false, 0), "down");
  assertEquals(mapServiceStatus(undefined, undefined), "unknown");
});

Deno.test("componentKey: prefers the permalink and falls back to a name slug", () => {
  assertEquals(
    componentKey({ permalink: "payments-api", name: "Payments API" }, 0),
    "payments-api",
  );
  assertEquals(componentKey({ name: "Payment Link" }, 3), "payment-link");
  assertEquals(componentKey({}, 7), "service-7");
});

Deno.test("COVERED_SERVICES: names exactly the payment-gateway components this app calls", () => {
  assertEquals(
    [...COVERED_SERVICES].sort(),
    ["Checkout", "Payment Link", "Payments API"].sort(),
  );
});
