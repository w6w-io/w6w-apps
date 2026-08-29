import { assertEquals } from "@std/assert";
import roomLinkDelete from "../../actions/room-link-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * Unlike most DELETEs in this API, this one answers 200 with a body
 * (`{"public": false}`), not 204 — the mock's default 200 status covers it.
 */
Deno.test("room-link-delete: DELETEs and returns the vendor's 200 body, not a bare 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { public: false } }]);
  const out = await roomLinkDelete.execute({ roomId: "5" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/link");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { public: false });
});
