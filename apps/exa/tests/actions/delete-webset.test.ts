import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-webset.ts";

Deno.test("delete-webset: DELETEs /v0/websets/{id}", async () => {
  const body = { id: "ws_1", status: "idle" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ id: "ws_1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v0/websets/ws_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, body);
});

Deno.test("delete-webset: is declared idempotent (safe to retry)", () => {
  assertEquals(action.idempotent, true);
});
