import { assertEquals } from "@std/assert";
import secretDelete from "../../actions/secret-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("secret-delete: DELETEs /secrets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { secret_id: "secret-1", key: "GH_TOKEN" } }]);
  const out = await secretDelete.execute({ secretId: "secret-1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/secrets/secret-1`);
  assertEquals(out.secret_id, "secret-1");
});

Deno.test("secret-delete: is marked idempotent — retrying lands on the same deleted state", () => {
  assertEquals(secretDelete.idempotent, true);
});
