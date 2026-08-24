import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs to /lists/{list_id}/contacts with snake_case fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "New contact has been created.",
        data: { contact_id: 552802, list_id: 428, _list_name: "List6eaG4lGIc9" },
      },
    },
  ]);

  const result = await action.execute(
    {
      listId: 428,
      phoneNumber: "+16783270696",
      firstName: "Ellen",
      lastName: "Diaz",
      organizationName: "Awesome Organization",
      addressCountry: "US",
    },
    ctx,
  ) as { contactId: number; listName: string };

  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/lists/428/contacts");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.phone_number, "+16783270696");
  assertEquals(sent.first_name, "Ellen");
  assertEquals(sent.organization_name, "Awesome Organization");
  assertEquals(sent.address_country, "US");
  assertEquals("faxNumber" in sent, false);

  assertEquals(result.contactId, 552802);
  assertEquals(result.listName, "List6eaG4lGIc9");
});
