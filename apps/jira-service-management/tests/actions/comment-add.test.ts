import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/comment-add.ts";

Deno.test("comment-add: POSTs a plain-string body, defaulting to public", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { id: "1" } }]);
  await action.execute({ issueIdOrKey: "HD-1", body: "Hello there" }, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/servicedeskapi/request/HD-1/comment");
  assertEquals(JSON.parse(calls[0].body!), { body: "Hello there", public: true });
});

Deno.test("comment-add: honors public:false for an internal comment", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: {} }]);
  await action.execute({ issueIdOrKey: "HD-1", body: "internal note", public: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { body: "internal note", public: false });
});
