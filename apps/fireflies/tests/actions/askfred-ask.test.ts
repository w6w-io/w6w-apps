import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/askfred-ask.ts";

const OK = { data: { createAskFredThread: { message: { thread_id: "th1", answer: "..." } } } };

Deno.test("askfred-ask: a single-meeting question sends transcript_id and no filters", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ query: "What was decided?", transcriptId: "t1" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("mutation CreateAskFredThread($input: CreateAskFredThreadInput!)"));
  assertEquals(variables.input, { query: "What was decided?", transcript_id: "t1" });
});

Deno.test("askfred-ask: filters are dropped when a transcript id is given", async () => {
  // Fireflies only consults `filters` when `transcript_id` is absent, so
  // sending both would quietly mislead the workflow author.
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { query: "q", transcriptId: "t1", organizers: "a@b.com", startTime: "2026-01-01T00:00:00Z" },
    ctx,
  );
  const input = sent(calls[0]).variables.input as Record<string, unknown>;
  assertEquals("filters" in input, false);
});

Deno.test("askfred-ask: a filtered question builds the filters object", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({
    query: "q",
    startTime: "2026-01-01T00:00:00Z",
    organizers: "a@b.com, c@d.com",
    channelIds: "c1",
  }, ctx);
  const input = sent(calls[0]).variables.input as { filters: Record<string, unknown> };
  assertEquals(input.filters, {
    start_time: "2026-01-01T00:00:00Z",
    organizers: ["a@b.com", "c@d.com"],
    channel_ids: ["c1"],
  });
});

Deno.test("askfred-ask: an unfiltered question ships no hollow filters object", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ query: "q" }, ctx);
  assertEquals(sent(calls[0]).variables.input, { query: "q" });
});

Deno.test("askfred-ask: spends AI credits, so it is a perform and not idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
