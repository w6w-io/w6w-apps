import { assertEquals } from "@std/assert";
import textUpdate from "../../actions/text-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("text-update: POSTs iden + data to /v2/texts/{iden}", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "t1" } }]);
  await textUpdate.execute({ iden: "t1", message: "updated" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/texts/t1");
  assertEquals(JSON.parse(calls[0].body!), { iden: "t1", data: { message: "updated" } });
});

Deno.test("text-update: omits an empty data object when nothing message-shaped changed", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await textUpdate.execute({ iden: "t1", skipDeleteFile: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("data" in body, false);
  assertEquals(body.skip_delete_file, true);
});

Deno.test("text-update: is declared idempotent — a no-op if already sent", () => {
  assertEquals(textUpdate.idempotent, true);
});
