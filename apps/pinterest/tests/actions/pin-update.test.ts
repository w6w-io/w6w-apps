import { assertEquals } from "@std/assert";
import pinUpdate from "../../actions/pin-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pin-update: PATCHes /pins/{id} with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "9", board_id: "2" } }]);
  const out = await pinUpdate.execute({ pinId: "9", boardId: "2" }, ctx) as { board_id: string };

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v5/pins/9");
  assertEquals(JSON.parse(calls[0].body!), { board_id: "2" });
  assertEquals(out.board_id, "2");
});

Deno.test("pin-update: forwards title/description/altText/link/boardSectionId", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "9" } }]);
  await pinUpdate.execute(
    { pinId: "9", title: "T", description: "D", altText: "A", link: "L", boardSectionId: "5" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    title: "T",
    description: "D",
    alt_text: "A",
    link: "L",
    board_section_id: "5",
  });
});
