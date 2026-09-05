import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user-capabilities.ts";

Deno.test("get-user-capabilities: GETs /rest/v1/users/me/capabilities", async () => {
  const { ctx, calls } = mockCtx([{ body: { capabilities: ["analytics"] } }]);
  const result = await action.execute({}, ctx) as { capabilities: string[] };
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/users/me/capabilities");
  assertEquals(result.capabilities, ["analytics"]);
});
