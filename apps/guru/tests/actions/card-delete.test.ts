import { assertEquals } from "@std/assert";
import cardDelete from "../../actions/card-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-delete: DELETEs the card and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await cardDelete.execute({ cardId: "c1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/cards/c1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});
