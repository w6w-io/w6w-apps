import { assertEquals } from "@std/assert";
import profileDelete from "../../actions/profile-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("profile-delete: DELETEs with a comma-joined profileNames query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await profileDelete.execute({ profileNames: "a, b" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/profiles");
  assertEquals(queryOf(calls[0].url), { profileNames: "a,b" });
  assertEquals(out, { success: true, profileNames: ["a", "b"] });
});

Deno.test("profile-delete: is declared idempotent", () => {
  assertEquals(profileDelete.idempotent, true);
});
