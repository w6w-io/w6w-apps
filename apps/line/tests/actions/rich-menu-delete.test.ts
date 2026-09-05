import { assertEquals } from "@std/assert";
import richMenuDelete from "../../actions/rich-menu-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rich-menu-delete: DELETEs /v2/bot/richmenu/{richMenuId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await richMenuDelete.execute({ richMenuId: "r1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/bot/richmenu/r1");
});

/** Already-gone is a successful end state for a retry, not an error. */
Deno.test("rich-menu-delete: a 404 (already deleted) is treated as success", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not found" } }]);
  const out = await richMenuDelete.execute({ richMenuId: "r1" }, ctx);
  assertEquals(out, {});
});

Deno.test("rich-menu-delete: any other failure still throws", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  let threw = false;
  try {
    await richMenuDelete.execute({ richMenuId: "r1" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("rich-menu-delete: is declared idempotent", () => {
  assertEquals(richMenuDelete.idempotent, true);
});
