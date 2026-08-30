import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/segment-list.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

/** The envelope's collection key is `lists`, not `segments` — this is the whole point of the test. */
Deno.test("segment-list: GETs /segments and reads the `lists` envelope key", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { total: 1, lists: { "3": { id: 3, name: "VIP" } } } },
  ], conn);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url.startsWith("https://mautic.example.com/api/segments"), true);
  assertEquals(out, [{ id: 3, name: "VIP" }]);
});
