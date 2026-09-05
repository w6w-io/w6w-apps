import { assertEquals } from "@std/assert";
import cardVerify from "../../actions/card-verify.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-verify: PUTs /verify and reports success on the documented 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await cardVerify.execute({ cardId: "c1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/cards/c1/verify");
  assertEquals(calls[0].method, "PUT");
  assertEquals(result, { verified: true });
});
