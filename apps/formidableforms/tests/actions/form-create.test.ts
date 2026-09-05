import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, bodyOf, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-create.ts";

Deno.test("form-create: POSTs to /forms", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "30" } }], { display: DISPLAY });
  await action.execute({ name: "Contact" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms`);
  assertEquals(bodyOf(calls), { name: "Contact" });
});

Deno.test("form-create: sends description, status and options when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute(
    { name: "Contact", description: "A form", status: "draft", options: { foo: "bar" } },
    ctx,
  );
  assertEquals(bodyOf(calls), {
    name: "Contact",
    description: "A form",
    status: "draft",
    options: { foo: "bar" },
  });
});

Deno.test("form-create: omits unset optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ name: "Contact" }, ctx);
  const body = bodyOf(calls);
  for (const k of ["description", "status", "options"]) assert(!(k in body), k);
});

Deno.test("form-create: is not idempotent and logs", async () => {
  assertEquals(action.idempotent, false);
  const { ctx, logs } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ name: "Contact" }, ctx);
  assertEquals(logs[0].level, "info");
});
