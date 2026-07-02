import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-repository.ts";

Deno.test("get-repository: GETs /repositories/{workspace}/{repo_slug}", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "backend" } }]);
  const result = await action.execute({ workspace: "acme", repoSlug: "backend" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/repositories/acme/backend");
  assertEquals((result as { slug: string }).slug, "backend");
});
