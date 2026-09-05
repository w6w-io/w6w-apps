import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-pages.ts";

Deno.test("list-pages: no Section ID means the flat, whole-location listing", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/pages");
});

Deno.test("list-pages: Section ID scopes to that section", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ sectionId: "sec1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/sections/sec1/pages");
});

Deno.test("list-pages: default page size is 20, matching Graph's own default", () => {
  const top = action.params!.find((p) => p.key === "top")!;
  assertEquals(top.default, 20);
});
