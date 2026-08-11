import { assert, assertEquals } from "@std/assert";
import logSearch from "../../actions/log-search.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("log-search: POSTs a filter document to /api/v2/logs/events/search", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "l1" }], meta: {} } }]);
  const out = await logSearch.execute(
    {
      query: "service:checkout status:error",
      from: "now-1h",
      to: "now",
      limit: 25,
      sort: "-timestamp",
    },
    ctx,
  ) as { data: unknown[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/logs/events/search");
  assertEquals(bodyOf(calls[0]), {
    filter: { query: "service:checkout status:error", from: "now-1h", to: "now" },
    page: { limit: 25 },
    sort: "-timestamp",
  });
  assertEquals(out.data, [{ id: "l1" }]);
});

/**
 * This is the only endpoint in the app that understands date math, and
 * `now-15m` / `now` are Datadog's own defaults for it — the third of three
 * incompatible time spellings across the surface.
 */
Deno.test("log-search: the defaults are the vendor's own date-math window", () => {
  assertEquals(logSearch.params?.find((p) => p.key === "from")?.default, "now-15m");
  assertEquals(logSearch.params?.find((p) => p.key === "to")?.default, "now");
  const hint = logSearch.params?.find((p) => p.key === "from")?.hint ?? "";
  assert(hint.includes("now-15m"), hint);
});

Deno.test("log-search: indexes are sent as an array, and the tier is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await logSearch.execute({ indexes: "main, audit", storageTier: "flex" }, ctx);
  assertEquals(bodyOf(calls[0]), {
    filter: { indexes: ["main", "audit"], storage_tier: "flex" },
  });
});

Deno.test("log-search: an empty search sends an empty document, not empty sub-objects", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await logSearch.execute({}, ctx);
  assertEquals(bodyOf(calls[0]), {});
});

Deno.test("log-search: the cursor goes in page, alongside the limit", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await logSearch.execute({ cursor: "abc", limit: 5 }, ctx);
  assertEquals(bodyOf(calls[0]), { page: { limit: 5, cursor: "abc" } });
});
