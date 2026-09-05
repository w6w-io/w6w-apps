import { assertEquals } from "@std/assert";
import chargeSkip from "../../actions/charge-skip.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("charge-skip: POSTs to /charges/{id}/skip with an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("charge", { id: 1, status: "skipped" }) }]);
  const out = await chargeSkip.execute({ chargeId: "1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/charges/1/skip");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { id: 1, status: "skipped" });
});

Deno.test("charge-skip: not marked idempotent", () => {
  assertEquals(chargeSkip.idempotent, false);
});
