import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, pageEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: forwards filters and drops unset ones", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await contactList.execute({ type: "individual", tags: "vip, board", page: 2 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(queryOf(calls[0].url), { type: "individual", tags: "vip, board", page: "2" });
});
