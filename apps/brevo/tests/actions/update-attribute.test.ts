import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-attribute.ts";

Deno.test("update-attribute: calculated — PUTs /contacts/attributes/calculated/{name} with value", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ category: "calculated", name: "AGE", value: "SUB(NOW(), DOB)" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/attributes/calculated/AGE");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.value, "SUB(NOW(), DOB)");
});

Deno.test("update-attribute: category — PUTs with enumeration and NOT value", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!(
    {
      category: "category",
      name: "PLAN",
      value: "ignored",
      enumeration: [{ value: 3, label: "Enterprise" }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals("value" in body, false);
  assertEquals(body.enumeration, [{ value: 3, label: "Enterprise" }]);
});
