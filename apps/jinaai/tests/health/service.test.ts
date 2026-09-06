import { assertEquals } from "@std/assert";
import service, {
  COVERED_GROUPS,
  COVERED_STANDALONE,
  mapComponentStatus,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** A trimmed fixture matching status.jina.ai's real shape, captured 2026-09-06. */
function summary(overrides: {
  components?: Array<Record<string, unknown>>;
  indicator?: string;
} = {}) {
  return {
    page: { id: "nldp3ndmy0vf", name: "Jina AI", url: "https://status.jina.ai" },
    components: overrides.components ?? [
      { id: "g-embed", name: "Embedding Models", group: true },
      { id: "g-rerank", name: "Reranker Models", group: true },
      { id: "g-reader", name: "Reader", group: true },
      { id: "c1", name: "jina-embeddings-v3", status: "operational", group_id: "g-embed" },
      {
        id: "c2",
        name: "jina-reranker-v2-base-multilingual",
        status: "operational",
        group_id: "g-rerank",
      },
      { id: "c3", name: "r.jina.ai", status: "major_outage", group_id: "g-reader" },
      { id: "c4", name: "s.jina.ai", status: "operational", group_id: "g-reader" },
      { id: "c5", name: "jina-vlm", status: "operational", group_id: "g-reader" },
    ],
    status: { indicator: overrides.indicator ?? "none", description: "All Systems Operational" },
    incidents: [],
  };
}

Deno.test("mapComponentStatus: maps the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: reports ok when every covered component is operational", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.jina.ai/api/v2/summary.json");
  assertEquals(report.state, "ok");
});

Deno.test("service: an outage on an UNCOVERED product (r.jina.ai) does not affect the verdict", async () => {
  // r.jina.ai is major_outage in the fixture, but Reader is not a covered group and jina-vlm
  // (the one Reader-group component this app DOES use) is still operational.
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals("c3" in (report.components ?? {}), false);
  assertEquals("c4" in (report.components ?? {}), false);
  assertEquals("c5" in (report.components ?? {}), true);
});

Deno.test("service: an outage on a COVERED component (Embedding Models) reports down", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: "g-embed", name: "Embedding Models", group: true },
        { id: "c1", name: "jina-embeddings-v3", status: "major_outage", group_id: "g-embed" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: covers only the declared groups plus jina-vlm", () => {
  assertEquals(COVERED_GROUPS.has("Embedding Models"), true);
  assertEquals(COVERED_GROUPS.has("Reranker Models"), true);
  assertEquals(COVERED_GROUPS.has("Reader"), false);
  assertEquals(COVERED_STANDALONE.has("jina-vlm"), true);
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Jina AI's is unknown", async () => {
  const { ctx } = mockCtx([
    { body: { page: { url: "https://status.example.com" }, components: [] } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
