import { assert, assertEquals } from "@std/assert";
import pinDelete from "../../actions/pin-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pin-delete: DELETEs /pins/{id} and reports 204 as deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await pinDelete.execute({ pinId: "9" }, ctx) as {
    deleted: boolean;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v5/pins/9");
  assert(out.deleted);
  assertEquals(out.status, 204);
});
