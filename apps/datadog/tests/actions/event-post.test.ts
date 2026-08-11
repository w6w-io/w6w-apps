import { assert, assertEquals } from "@std/assert";
import eventPost from "../../actions/event-post.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/**
 * v1, not v2 — and this is the assertion that keeps it that way. Datadog's
 * `POST /api/v2/events` carries a `servers` override putting it on
 * `event-management-intake.<site>`, a host this app does not allowlist. Only
 * `POST /api/v1/events` is on `api.<site>`.
 */
Deno.test("event-post: POSTs to /api/v1/events, the one on api.<site>", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { status: "ok", event: { id: 1 } } }]);
  const out = await eventPost.execute({ title: "Deploy", text: "v1.2.3 shipped" }, ctx) as {
    status?: string;
    event?: unknown;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/events");
  assertEquals(bodyOf(calls[0]), { title: "Deploy", text: "v1.2.3 shipped" });
  assertEquals(out.status, "ok");
  assertEquals(out.event, { id: 1 });
});

Deno.test("event-post: optional fields are snake_cased and omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await eventPost.execute({
    title: "t",
    text: "x",
    alertType: "error",
    priority: "low",
    tags: "env:prod, team:core",
    host: "web-01",
    aggregationKey: "deploy-42",
    sourceTypeName: "my_apps",
    dateHappened: 1_700_000_000,
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    title: "t",
    text: "x",
    alert_type: "error",
    priority: "low",
    host: "web-01",
    aggregation_key: "deploy-42",
    source_type_name: "my_apps",
    date_happened: 1_700_000_000,
    tags: ["env:prod", "team:core"],
  });
});

/** An aggregation key groups events in the stream; it does not deduplicate them. */
Deno.test("event-post: it is a non-idempotent perform", () => {
  assertEquals(eventPost.type, "perform");
  assertEquals(eventPost.idempotent, false);
  const hint = eventPost.params?.find((p) => p.key === "aggregationKey")?.hint ?? "";
  assert(hint.includes("does not deduplicate"), hint);
});

Deno.test("event-post: the text field states the 4,000-character and markdown rules", () => {
  const hint = eventPost.params?.find((p) => p.key === "text")?.hint ?? "";
  assert(hint.includes("4,000"), hint);
  assert(hint.includes("%%%"), hint);
});
