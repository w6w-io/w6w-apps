import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cadence-list.ts";

Deno.test("cadence-list: GETs /cadences with query filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ teamCadence: true, archived: false }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/cadences");
  assertEquals(url.searchParams.get("team_cadence"), "true");
  assertEquals(url.searchParams.get("archived"), "false");
});
