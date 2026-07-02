import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-attribute.ts";

Deno.test("create-attribute: normal — POSTs /contacts/attributes/normal/{name} with type=boolean override", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ category: "normal", name: "FIRSTNAME", type: "text" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/attributes/normal/FIRSTNAME");
  assertEquals(calls[0].method, "POST");
  // n8n's INTERCEPTORS.NORMAL clobbers type -> 'boolean' regardless of what the caller picked.
  assertEquals(JSON.parse(calls[0].body!).type, "boolean");
});

Deno.test("create-attribute: category — POSTs with type=category and enumeration array", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!(
    {
      category: "category",
      name: "PLAN",
      enumeration: [
        { value: 1, label: "Basic" },
        { value: 2, label: "Pro" },
      ],
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/attributes/category/PLAN");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "category");
  assertEquals(body.enumeration, [
    { value: 1, label: "Basic" },
    { value: 2, label: "Pro" },
  ]);
});

Deno.test("create-attribute: transactional — POSTs with type=id override", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ category: "transactional", name: "ORDER_ID" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/attributes/transactional/ORDER_ID");
  assertEquals(JSON.parse(calls[0].body!).type, "id");
});

Deno.test("create-attribute: global — POSTs with the user-supplied value and no type override", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ category: "global", name: "DOB", value: "1985-11-01" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.value, "1985-11-01");
  assertEquals("type" in body, false);
});

Deno.test("create-attribute: calculated — POSTs with the user-supplied value", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ category: "calculated", name: "AGE", value: "SUB(NOW(), DOB)" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.value, "SUB(NOW(), DOB)");
});
