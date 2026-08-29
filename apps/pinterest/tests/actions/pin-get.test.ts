import { assertEquals } from "@std/assert";
import pinGet from "../../actions/pin-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pin-get: calls GET /pins/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "9", title: "Photo" } }]);
  const out = await pinGet.execute({ pinId: "9" }, ctx) as { title: string };

  assertEquals(pathOf(calls[0].url), "/v5/pins/9");
  assertEquals(out.title, "Photo");
});
