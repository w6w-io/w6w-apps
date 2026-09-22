import { assertEquals } from "@std/assert";
import libraryList from "../../actions/library-list.ts";
import { API_ROOT, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("library-list: calls GET /libraries", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ libraryId: "GR_1" }]) }]);
  const out = await libraryList.execute({}, ctx) as { elements: unknown[] };

  assertEquals(calls[0].url, `${API_ROOT}/libraries`);
  assertEquals(out.elements, [{ libraryId: "GR_1" }]);
});

Deno.test("library-list: an empty list is a valid answer, not an error", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([]) }]);
  const out = await libraryList.execute({}, ctx) as { elements: unknown[]; count: number };

  assertEquals(out.elements, []);
  assertEquals(out.count, 0);
});
