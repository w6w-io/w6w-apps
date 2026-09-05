import { assertEquals } from "@std/assert";
import clickGet from "../../actions/click-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("click-get: fetches click details by id", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", details: { os: "Mac OS X" } } },
  ]);
  const out = await clickGet.execute({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/clicks/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/");
  assertEquals(out, { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", details: { os: "Mac OS X" } });
});
