import { assertEquals } from "@std/assert";
import recipientList from "../../actions/recipient-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recipient-list: GETs /recipients", async () => {
  const { ctx, calls } = mockCtx([{ body: { recipients: [{ id: "rec_1" }], page: {} } }]);
  const out = await recipientList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/recipients");
  assertEquals((out.items as unknown[]).length, 1);
});
