import { assertEquals } from "@std/assert";
import action from "../../actions/response-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("response-delete: deletes one or more comma-separated ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ ids: "r1, r2" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/responses/r1,r2");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
