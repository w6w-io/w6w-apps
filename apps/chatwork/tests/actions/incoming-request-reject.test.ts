import { assertEquals } from "@std/assert";
import incomingRequestReject from "../../actions/incoming-request-reject.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("incoming-request-reject: DELETEs and returns {} on the documented 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await incomingRequestReject.execute({ requestId: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/incoming_requests/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
