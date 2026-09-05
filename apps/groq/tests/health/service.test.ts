import { assert, assertEquals } from "@std/assert";
import service, { slug, STATUS_HOST, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * A trimmed but structurally faithful copy of the real groqstatus.com
 * `/api/v2/summary.json` payload (fetched 2026-09-05) — most components are
 * per-model, plus a plain `API` and `Website` component.
 */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "01K053E2FA7DSQPVGWM7A75WHX", name: "Groq Status" },
    status: { description: "All Systems Operational", indicator: "none" },
    components: [
      { id: "1", name: "openai/gpt-oss-20b", status: "operational" },
      { id: "2", name: "llama-3.3-70b-versatile", status: "operational" },
      { id: "3", name: "Website", status: "operational" },
      { id: "4", name: "API", status: "operational" },
      { id: "5", name: "whisper-large-v3", status: "operational" },
    ],
    ...overrides,
  };
}

Deno.test("service: declares groqstatus.com, unsigned, with its own egress", () => {
  assertEquals(STATUS_HOST, "groqstatus.com");
  assertEquals(STATUS_URL, "https://groqstatus.com/api/v2/summary.json");
  assertEquals(service.network?.allow, [STATUS_HOST]);
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  // Widening egress is bound to an unsigned posture; `none` is this kind's default.
  assert(service.credential === undefined || service.credential === "none");
});

Deno.test("slug: normalizes a component name to a stable kebab-case id", () => {
  assertEquals(slug("openai/gpt-oss-20b"), "openai-gpt-oss-20b");
  assertEquals(slug("API"), "api");
  assertEquals(slug("Canopy Labs Orpheus Arabic Saudi"), "canopy-labs-orpheus-arabic-saudi");
});

Deno.test("service: an all-clear page reports ok and lists every component", async () => {
  const { ctx, calls } = mockCtx([{ body: payload() }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 5);
  assertEquals(report.components?.api, { state: "ok" });
  assertEquals(report.components?.website, { state: "ok" });
});

Deno.test("service: a degraded MODEL component alone does not worsen the roll-up", async () => {
  const { ctx } = mockCtx([{
    body: payload({
      components: [
        { id: "1", name: "openai/gpt-oss-20b", status: "major_outage" },
        { id: "3", name: "Website", status: "operational" },
        { id: "4", name: "API", status: "operational" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  // The API and Website components are fine; one model being down is a real,
  // visible fact (in `components`) but is not "the API is down".
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["openai-gpt-oss-20b"], { state: "down" });
});

Deno.test("service: a degraded API component DOES worsen the roll-up", async () => {
  const { ctx } = mockCtx([{
    body: payload({
      components: [
        { id: "3", name: "Website", status: "operational" },
        { id: "4", name: "API", status: "partial_outage" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: falls back to the page-level indicator if API/Website are ever absent", async () => {
  const { ctx } = mockCtx([{
    body: payload({
      status: { description: "Partial outage", indicator: "major" },
      components: [{ id: "1", name: "some-model", status: "operational" }],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message, "Partial outage");
});

Deno.test("service: an unreachable status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
