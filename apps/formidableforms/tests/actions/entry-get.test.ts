import { assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-get.ts";

Deno.test("entry-get: GETs /entries/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "84434" } }], { display: DISPLAY });
  const out = await action.execute({ entryId: 84434 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/entries/84434`);
  assertEquals(out, { id: "84434" });
});
