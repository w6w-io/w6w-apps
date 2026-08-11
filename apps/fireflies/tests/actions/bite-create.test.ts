import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/bite-create.ts";

const OK = { data: { createBite: { id: "b1", status: "processing" } } };

Deno.test("bite-create: clip boundaries stay Float variables, not integer literals", async () => {
  // Unlike pagination, a clip boundary is legitimately fractional — forcing
  // these through the integer-literal path would silently reject 12.5s.
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ transcriptId: "t1", startTime: 12.5, endTime: 30 }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("$startTime: Float!"));
  assert(query.includes("$endTime: Float!"));
  assertEquals(variables, { transcriptId: "t1", startTime: 12.5, endTime: 30 });
});

Deno.test("bite-create: a start time of 0 is kept, not compacted away", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ transcriptId: "t1", startTime: 0, endTime: 5 }, ctx);
  assertEquals(sent(calls[0]).variables.startTime, 0);
});

Deno.test("bite-create: privacies is a comma-separated list", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { transcriptId: "t1", startTime: 0, endTime: 5, privacies: "team, participants" },
    ctx,
  );
  assertEquals(sent(calls[0]).variables.privacies, ["team", "participants"]);
});
