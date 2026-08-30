import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-list.ts";

Deno.test("create-list: POSTs to {site}/lists", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "L1" } }]);
  await action.execute({ displayName: "Books" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/lists");
  assertEquals(calls[0].method, "POST");
});

Deno.test("create-list: defaults to the genericList template", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ displayName: "Books" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    displayName: "Books",
    list: { template: "genericList" },
  });
});

Deno.test("create-list: an explicit template and custom columns ride in the body, per the reference's own example", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    displayName: "Books",
    template: "documentLibrary",
    columns: [{ name: "Author", text: {} }, { name: "PageCount", number: {} }],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    displayName: "Books",
    columns: [{ name: "Author", text: {} }, { name: "PageCount", number: {} }],
    list: { template: "documentLibrary" },
  });
});

Deno.test("create-list: is not idempotent — a repeat call mints a second list", () => {
  assertEquals(action.idempotent, false);
});
