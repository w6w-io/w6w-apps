import { assertEquals } from "@std/assert";
import directoryList from "../../actions/directory-list.ts";
import { API_ROOT, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("directory-list: calls GET /directories and flattens result.elements", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ directoryId: "POOL_1" }]) }]);
  const out = await directoryList.execute({}, ctx) as { elements: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/directories`);
  assertEquals(out.elements, [{ directoryId: "POOL_1" }]);
});

Deno.test("directory-list: follows nextPage", async () => {
  const page2 = "https://iad1.qualtrics.com/API/v3/directories?offset=10";
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ directoryId: "POOL_1" }], page2) },
    { body: listEnvelope([{ directoryId: "POOL_2" }]) },
  ]);

  const out = await directoryList.execute({}, ctx) as { elements: unknown[] };
  assertEquals(calls[1].url, page2);
  assertEquals(out.elements.length, 2);
});
