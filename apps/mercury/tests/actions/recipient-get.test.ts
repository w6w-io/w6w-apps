import { assertEquals } from "@std/assert";
import recipientGet from "../../actions/recipient-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recipient-get: GETs /recipient/{recipientId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec_1", name: "Acme Corp" } }]);
  const out = await recipientGet.execute({ recipientId: "rec_1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/recipient/rec_1");
  assertEquals((out.recipient as { name: string }).name, "Acme Corp");
});
