import { assertEquals } from "@std/assert";
import profileGet from "../../actions/profile-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("profile-get: fetches /profiles/me", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "pfl_1", name: "My Website", status: "verified" },
  }]);
  const out = await profileGet.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/profiles/me");
  assertEquals(out, { id: "pfl_1", name: "My Website", status: "verified" });
});
