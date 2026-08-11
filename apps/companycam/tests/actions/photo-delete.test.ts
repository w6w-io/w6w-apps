import { assertEquals } from "@std/assert";
import photoDelete from "../../actions/photo-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("photo-delete: DELETEs and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await photoDelete.execute({ photoId: "1", actAs: "crew@x.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/photos/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].headers["x-companycam-user"], "crew@x.com");
  assertEquals(result, { status: 204 });
});
