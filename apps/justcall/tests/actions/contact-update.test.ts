import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PUTs to the /v2.1/contacts collection, id in the body", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "success", data: [{ id: 1234, name: "Rachel Green" }] } },
  ]);
  const out = await contactUpdate.execute({ id: 1234, last_name: "Green" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2.1/contacts");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { id: 1234, last_name: "Green" });
  assertEquals(out, { id: 1234, name: "Rachel Green" });
});
