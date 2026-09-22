import { assertEquals } from "@std/assert";
import titleGet from "../../actions/title-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const TITLE = { id: "tl_1", name: "Staff Engineer" };

Deno.test("title-get: GETs one title by id", async () => {
  const { ctx, calls } = mockCtx([{ body: TITLE }]);
  const result = await titleGet.execute({ id: "tl_1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/titles/tl_1");
  assertEquals(result, TITLE);
});

Deno.test("title-get: it is a read with exactly one required param", async () => {
  assertEquals(titleGet.type, "read");
  assertEquals(titleGet.params?.filter((p) => p.required).map((p) => p.key), ["id"]);

  const { ctx, calls } = mockCtx([{ body: TITLE }]);
  await titleGet.execute({ id: "tl/1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/titles/tl%2F1");
});
