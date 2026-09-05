import { assertEquals } from "@std/assert";
import commentAdd from "../../actions/comment-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-add: POSTs a plain-string body, not ADF", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "10", created: "now" } }]);
  await commentAdd.execute({ issueKey: "ENG-1", body: "Looks good" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/issue/ENG-1/comment");
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.body, "Looks good");
  assertEquals(body.visibility, undefined);
});

Deno.test("comment-add: restricts visibility to the given role", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "10" } }]);
  await commentAdd.execute({
    issueKey: "ENG-1",
    body: "internal note",
    visibilityRole: "Administrators",
  }, ctx);
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.visibility, { type: "role", value: "Administrators" });
});
