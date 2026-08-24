import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-contact.ts";

Deno.test("get-contact: is a read action requiring contactId", () => {
  assertEquals(action.type, "read");
  const p = (action.params ?? []).find((p) => p.key === "contactId")!;
  assertEquals(p.required, true);
});

Deno.test("get-contact: GETs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 42, first_name: "Kevin" } }]);
  const result = await action.execute({ contactId: 42 }, ctx) as { id: number };
  assertEquals(new URL(calls[0].url).pathname, "/v1/contacts/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.id, 42);
});
