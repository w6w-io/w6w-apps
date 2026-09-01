import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-profile.ts";

Deno.test("get-profile: GETs /{accountId}/profiles/{profileId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "prof-1" } }]);
  const result = await action.execute({ accountId: "acc-1", profileId: "prof-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/acc-1/profiles/prof-1");
  assertEquals(result, { id: "prof-1" });
});
