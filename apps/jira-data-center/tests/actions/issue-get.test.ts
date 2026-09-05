import { assertEquals } from "@std/assert";
import issueGet from "../../actions/issue-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("issue-get: GETs /issue/{key} and omits blank fields/expand", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", key: "ENG-1" } }]);
  await issueGet.execute({ issueKey: "ENG-1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/issue/ENG-1");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("issue-get: forwards fields and expand when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", key: "ENG-1" } }]);
  await issueGet.execute({ issueKey: "ENG-1", fields: "summary,status", expand: "changelog" }, ctx);
  assertEquals(queryOf(calls[0].url), { fields: "summary,status", expand: "changelog" });
});
