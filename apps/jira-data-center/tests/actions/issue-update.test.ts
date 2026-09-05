import { assertEquals } from "@std/assert";
import issueUpdate from "../../actions/issue-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("issue-update: PUTs only the fields that were actually set", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await issueUpdate.execute({ issueKey: "ENG-1", summary: "New summary" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/issue/ENG-1");
  const body = JSON.parse(calls[0].body!) as { fields: Record<string, unknown> };
  assertEquals(body.fields, { summary: "New summary" });
});

Deno.test("issue-update: declared idempotent", () => {
  assertEquals(issueUpdate.idempotent, true);
});
