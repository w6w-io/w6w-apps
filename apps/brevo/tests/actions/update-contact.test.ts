import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-contact.ts";

Deno.test("update-contact: PUTs /v3/contacts/{id} with the update payload", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!(
    { identifier: "ada@x.com", attributes: { FIRSTNAME: "Ada" }, listIds: [7] },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/ada%40x.com");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.attributes, { FIRSTNAME: "Ada" });
  assertEquals(body.listIds, [7]);
  assertEquals(result, { success: true });
});

Deno.test("update-contact: sends an empty body when no updates provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ identifier: "1234" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
