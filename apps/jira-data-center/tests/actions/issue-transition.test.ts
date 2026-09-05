import { assertEquals } from "@std/assert";
import issueTransition from "../../actions/issue-transition.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("issue-transition: POSTs the transition id, a plain-string comment and resolution", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await issueTransition.execute({
    issueKey: "ENG-1",
    transitionId: "21",
    comment: "Closing this out",
    resolution: "Done",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/issue/ENG-1/transitions");
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.transition, { id: "21" });
  assertEquals(body.fields, { resolution: { name: "Done" } });
  assertEquals(body.update, { comment: [{ add: { body: "Closing this out" } }] });
});

Deno.test("issue-transition: declared idempotent", () => {
  assertEquals(issueTransition.idempotent, true);
});
