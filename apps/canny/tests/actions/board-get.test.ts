import { assertEquals } from "@std/assert";
import boardGet from "../../actions/board-get.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("board-get: posts id to /v1/boards/retrieve", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1", name: "Feature Requests" } }]);
  const out = await boardGet.execute({ id: "b1" }, ctx) as { name: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/boards/retrieve");
  assertEquals(bodyOf(calls[0]), { id: "b1" });
  assertEquals(out.name, "Feature Requests");
});
