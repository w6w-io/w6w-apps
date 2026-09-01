import { assertEquals } from "@std/assert";
import sequenceStart from "../../actions/sequence-start.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sequence-start: POSTs /v3/sequences/{id}/start", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, status: "active" } }]);
  const out = await sequenceStart.execute({ id: 9 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/sequences/9/start");
  assertEquals(out, { id: 9, status: "active" });
});

/** Starting an already-active sequence is a 409, not a no-op — so this must not be marked idempotent. */
Deno.test("sequence-start: is not idempotent", () => {
  assertEquals(sequenceStart.idempotent, false);
});
