import { assertEquals } from "@std/assert";
import profileList from "../../actions/profile-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("profile-list: unwraps _embedded.profiles from /profiles", async () => {
  const { ctx, calls } = mockCtx([{ body: list("profiles", [{ id: "pfl_1" }]) }]);
  const out = await profileList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/profiles");
  assertEquals(out, { count: 1, items: [{ id: "pfl_1" }] });
});
