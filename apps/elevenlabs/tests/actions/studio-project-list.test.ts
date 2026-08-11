import { assertEquals } from "@std/assert";
import studioProjectList from "../../actions/studio-project-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("studio-project-list: reads every project in one call", async () => {
  const body = { projects: [{ project_id: "p1", name: "Chapter One", state: "default" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await studioProjectList.execute({}, ctx), body);
  assertEquals(pathOf(calls[0].url), "/v1/studio/projects");
});

/** The endpoint declares no query parameters at all — there is nothing to page. */
Deno.test("studio-project-list: sends no query, because the endpoint accepts none", async () => {
  const { ctx, calls } = mockCtx([{ body: { projects: [] } }]);
  await studioProjectList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(studioProjectList.params, []);
});
