import { assertEquals } from "@std/assert";
import contributorList from "../../actions/contributor-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contributor-list: lists a project's contributors", async () => {
  const { ctx, calls } = mockCtx([{ body: { contributors: [{ email: "a@example.com" }] } }]);
  const out = await contributorList.execute({ projectId: "p1", limit: 50 }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/contributors");
  assertEquals(out.items, [{ email: "a@example.com" }]);
});
