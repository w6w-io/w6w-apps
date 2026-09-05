import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, bodyOf, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-update.ts";

Deno.test("form-update: PATCHes /forms/{id} with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ formId: 25, name: "New Name" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/25`);
  assertEquals(bodyOf(calls), { name: "New Name" });
});

Deno.test("form-update: omits fields the caller left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ formId: 25, name: "New Name" }, ctx);
  const body = bodyOf(calls);
  for (const k of ["description", "status", "options"]) assert(!(k in body), k);
});

Deno.test("form-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
