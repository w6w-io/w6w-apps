import { assertEquals, assertRejects } from "@std/assert";
import actorRun from "../../actions/actor-run.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const RUN = envelope({ id: "r1", status: "READY", defaultDatasetId: "d1" });

Deno.test("actor-run: POSTs the input as the body and the options as query", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RUN }]);
  const out = await actorRun.execute(
    { actorId: "apify~web-scraper", input: { startUrls: ["https://a.example"] }, memory: 1024 },
    ctx,
  ) as { id: string; defaultDatasetId: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/actors/apify~web-scraper/runs");
  assertEquals(queryOf(calls[0].url), { memory: "1024" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { startUrls: ["https://a.example"] });
  assertEquals(out.id, "r1");
  assertEquals(out.defaultDatasetId, "d1");
});

Deno.test("actor-run: an absent input still sends a JSON object body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RUN }]);
  await actorRun.execute({ actorId: "a1" }, ctx);
  assertEquals(calls[0].body, "{}");
});

Deno.test("actor-run: input accepts the string form a user types", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RUN }]);
  await actorRun.execute({ actorId: "a1", input: '{"maxItems":5}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { maxItems: 5 });
});

Deno.test("actor-run: malformed input JSON fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    // An async wrapper, not `Promise.resolve(...)`: `execute` here is a
    // synchronous function that throws before it ever returns a promise, which
    // is the pack idiom for input validation. Wrapping in an async function
    // turns that into the rejection every caller actually observes — the
    // runtime awaits the hook — so this assertion covers both shapes instead of
    // only one.
    async () => await actorRun.execute({ actorId: "a1", input: "{not json" }, ctx),
    Error,
    "Actor input is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

/**
 * Apify offers no idempotency key on any run endpoint, so a retry is a second
 * billed crawl. The runtime reads this flag to decide whether it may retry.
 */
Deno.test("actor-run: is declared non-idempotent", () => {
  assertEquals(actorRun.idempotent, false);
});

Deno.test("actor-run: waitForFinish is capped at Apify's 60-second ceiling", () => {
  const p = actorRun.params?.find((p) => p.key === "waitForFinish");
  assertEquals(p?.validation?.max, 60);
});
