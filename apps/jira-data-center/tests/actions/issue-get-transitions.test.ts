import { assertEquals } from "@std/assert";
import issueGetTransitions from "../../actions/issue-get-transitions.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("issue-get-transitions: GETs /issue/{key}/transitions", async () => {
  const { ctx, calls } = mockCtx([{ body: { transitions: [{ id: "21", name: "Done" }] } }]);
  const out = await issueGetTransitions.execute({ issueKey: "ENG-1" }, ctx) as {
    transitions: unknown[];
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/issue/ENG-1/transitions");
  assertEquals(out.transitions.length, 1);
});
