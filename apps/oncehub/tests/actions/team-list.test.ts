import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-list.ts";

Deno.test("team-list: GETs /teams with the user filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await action.execute({ user: "USR-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/teams");
  assertEquals(url.searchParams.get("user"), "USR-1");
});
