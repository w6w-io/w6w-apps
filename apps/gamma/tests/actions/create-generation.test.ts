import { assertEquals } from "@std/assert";
import createGeneration from "../../actions/create-generation.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-generation: POSTs /generations with a compacted body", async () => {
  const { ctx, calls } = mockCtx([{ body: { generationId: "gen1" } }]);
  const out = await createGeneration.execute({ inputText: "renewable energy" }, ctx) as {
    generationId: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1.0/generations");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { inputText: "renewable energy" });
  assertEquals(out.generationId, "gen1");
});

Deno.test("create-generation: a single folderId is wrapped into the one-element folderIds array", async () => {
  const { ctx, calls } = mockCtx([{ body: { generationId: "gen1" } }]);
  await createGeneration.execute({ inputText: "hi", folderId: "f_123" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.folderIds, ["f_123"]);
  assertEquals("folderId" in body, false);
});

Deno.test("create-generation: pages (JSON) passes through untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: { generationId: "gen1" } }]);
  const pages = [{ inputText: "page one" }, { inputText: "page two" }];
  await createGeneration.execute({ pages }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.pages, pages);
  assertEquals("inputText" in body, false);
});
