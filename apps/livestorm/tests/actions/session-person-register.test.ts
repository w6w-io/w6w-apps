import { assertEquals } from "@std/assert";
import sessionPersonRegister from "../../actions/session-person-register.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("session-person-register: POSTs registration data as a fields array, not top-level keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("people", "p1") }]);
  await sessionPersonRegister.execute({
    id: "s1",
    fields: { email: "a@b.com", first_name: "A" },
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1/people");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!) as { data: { attributes: Record<string, unknown> } };
  assertEquals(body.data.attributes.fields, [
    { id: "email", value: "a@b.com" },
    { id: "first_name", value: "A" },
  ]);
  assertEquals(body.data.attributes.email, undefined);
});
