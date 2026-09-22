import { assertEquals } from "@std/assert";
import mailingListContactList from "../../actions/mailing-list-contact-list.ts";
import { API_ROOT, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("mailing-list-contact-list: calls the list-scoped contacts route", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ contactId: "CID_1" }]) }]);
  const out = await mailingListContactList.execute({ mailingListId: "CG_1" }, ctx) as {
    elements: unknown[];
  };

  assertEquals(calls[0].url, `${API_ROOT}/mailinglists/CG_1/contacts`);
  assertEquals(out.elements, [{ contactId: "CID_1" }]);
});

Deno.test("mailing-list-contact-list: path-escapes the list id", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await mailingListContactList.execute({ mailingListId: "CG/1" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/mailinglists/CG%2F1/contacts`);
});
