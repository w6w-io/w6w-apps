import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import cardMove from "../../actions/card-move.ts";

Deno.test("card-move: moves a card and returns its new phase", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { moveCardToPhase: { card: { id: "1", current_phase: { id: "10" } } } } },
  }]);
  const out = await cardMove.execute(
    { cardId: "1", destinationPhaseId: "10" },
    ctx,
  ) as { current_phase: { id: string } };
  assertEquals(out.current_phase.id, "10");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assertEquals(
    q,
    "mutation { moveCardToPhase(input: { card_id: 1, destination_phase_id: 10 }) { card { id current_phase { id name } } } }",
  );
});

Deno.test("card-move: an invalid transition surfaces Pipefy's own error text", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: { moveCardToPhase: null },
      errors: [{ message: "Card could not be moved to phase id: 999" }],
    },
  }]);
  await assertRejects(
    async () => await cardMove.execute({ cardId: "1", destinationPhaseId: "999" }, ctx),
    Error,
    "Card could not be moved to phase id: 999",
  );
});

Deno.test("card-move: type/resource/idempotency metadata", () => {
  assertEquals(cardMove.type, "perform");
  assertEquals(cardMove.resource, "card");
  assertEquals(cardMove.idempotent, true);
});
