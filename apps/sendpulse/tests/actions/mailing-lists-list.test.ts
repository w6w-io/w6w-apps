import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/mailing-lists-list.ts";

Deno.test("mailing-lists-list: GETs /addressbooks with default limit/offset", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/addressbooks?limit=100&offset=0");
});
