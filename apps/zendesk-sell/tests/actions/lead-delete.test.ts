import { assertEquals } from "@std/assert";
import leadDelete from "../../actions/lead-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-delete: DELETEs /v2/leads/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await leadDelete.execute({ id: 1 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/leads/1");
  assertEquals(calls[0].method, "DELETE");
});
