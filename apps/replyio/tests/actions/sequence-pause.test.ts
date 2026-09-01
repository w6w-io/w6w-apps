import { assertEquals } from "@std/assert";
import sequencePause from "../../actions/sequence-pause.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sequence-pause: POSTs /v3/sequences/{id}/pause", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, status: "paused" } }]);
  const out = await sequencePause.execute({ id: 9 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/sequences/9/pause");
  assertEquals(out, { id: 9, status: "paused" });
});

Deno.test("sequence-pause: is not idempotent", () => {
  assertEquals(sequencePause.idempotent, false);
});
