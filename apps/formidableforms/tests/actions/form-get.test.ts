import { assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get.ts";

Deno.test("form-get: GETs /forms/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "25" } }], { display: DISPLAY });
  const out = await action.execute({ formId: 25 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/25`);
  assertEquals(out, { id: "25" });
});

Deno.test("form-get: accepts a form key verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ formId: "contact-form" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/contact-form`);
});
