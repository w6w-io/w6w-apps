import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-add.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

Deno.test("comment-add: POSTs the comment text and mentions", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "4" } }], conn);
  const out = await action.execute(
    {
      appId: "1",
      recordId: "1",
      text: "hello",
      mentions: [{ code: "Administrator", type: "USER" }],
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    app: "1",
    record: "1",
    comment: { text: "hello", mentions: [{ code: "Administrator", type: "USER" }] },
  });
  assertEquals(out, { id: "4" });
});

Deno.test("comment-add: mentions is optional and omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "5" } }], conn);
  await action.execute({ appId: "1", recordId: "1", text: "hi" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).comment, { text: "hi" });
});
