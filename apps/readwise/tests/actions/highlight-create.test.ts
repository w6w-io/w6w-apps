import { assertEquals } from "@std/assert";
import highlightCreate from "../../actions/highlight-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const CREATED = [
  {
    id: 111,
    title: "Moby Dick",
    author: "Herman Melville",
    category: "books",
    num_highlights: 1,
    modified_highlights: [1337],
  },
];

Deno.test("highlight-create: posts a single-element highlights array", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await highlightCreate.execute({ text: "Call me Ishmael", title: "Moby Dick" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/highlights/");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.highlights.length, 1);
  assertEquals(body.highlights[0], { text: "Call me Ishmael", title: "Moby Dick" });
});

Deno.test("highlight-create: omits unset optional fields from the wire payload", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await highlightCreate.execute({ text: "just text" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.highlights[0], { text: "just text" });
});

Deno.test("highlight-create: lifts the first modified_highlights id for chaining", async () => {
  const { ctx } = mockCtx([{ body: CREATED }]);
  const out = await highlightCreate.execute({ text: "hi" }, ctx) as {
    highlightId?: number;
    books: unknown;
  };
  assertEquals(out.highlightId, 1337);
  assertEquals(out.books, CREATED);
});

Deno.test("highlight-create: maps camelCase input to the vendor's snake_case fields", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await highlightCreate.execute({
    text: "hi",
    imageUrl: "https://img.example/cover.png",
    sourceUrl: "https://example.com/a",
    sourceType: "my_app",
    highlightedAt: "2020-07-14T20:11:24+00:00",
    highlightUrl: "https://example.com/a#hl1",
    locationType: "page",
  }, ctx);
  const body = JSON.parse(calls[0].body!).highlights[0];
  assertEquals(body.image_url, "https://img.example/cover.png");
  assertEquals(body.source_url, "https://example.com/a");
  assertEquals(body.source_type, "my_app");
  assertEquals(body.highlighted_at, "2020-07-14T20:11:24+00:00");
  assertEquals(body.highlight_url, "https://example.com/a#hl1");
  assertEquals(body.location_type, "page");
});

Deno.test("highlight-create: is idempotent, per the vendor's own de-dupe rule", () => {
  assertEquals(highlightCreate.idempotent, true);
});
