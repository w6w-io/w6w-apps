import { assertEquals } from "@std/assert";
import pinCreate from "../../actions/pin-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pin-create: POSTs /pins with an image_url media_source", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "9", link: null, board_id: "1" } },
  ]);
  const out = await pinCreate.execute(
    { boardId: "1", imageUrl: "https://example.com/photo.jpg", title: "Photo" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v5/pins");
  assertEquals(JSON.parse(calls[0].body!), {
    board_id: "1",
    title: "Photo",
    media_source: { source_type: "image_url", url: "https://example.com/photo.jpg" },
  });
  assertEquals(out.id, "9");
});

Deno.test("pin-create: includes optional fields only when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "9" } }]);
  await pinCreate.execute(
    {
      boardId: "1",
      imageUrl: "https://example.com/a.jpg",
      description: "desc",
      altText: "alt",
      link: "https://example.com",
      boardSectionId: "5",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.description, "desc");
  assertEquals(body.alt_text, "alt");
  assertEquals(body.link, "https://example.com");
  assertEquals(body.board_section_id, "5");
  assertEquals("title" in body, false);
});
