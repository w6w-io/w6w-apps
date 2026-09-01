import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

Deno.test("project-list: GETs /projects under the connection's businessId", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { projects: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/projects/business/biz1/projects");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("project-list: forwards filters as plain query params", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { projects: [] } }]);
  await action.execute({ filters: { active: true } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("active"), "true");
});
