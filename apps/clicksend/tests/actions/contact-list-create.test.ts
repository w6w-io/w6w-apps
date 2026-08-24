import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list-create.ts";

Deno.test("contact-list-create: POSTs { list_name } to /lists", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "New list has been created.",
        data: {
          list_id: 437,
          list_name: "MyList",
          list_email_id: "KB0LHD6WXFVHZWTR",
          _contacts_count: 0,
        },
      },
    },
  ]);
  const result = await action.execute({ listName: "MyList" }, ctx) as {
    listId: number;
    contactsCount: number;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/lists");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { list_name: "MyList" });
  assertEquals(result.listId, 437);
  assertEquals(result.contactsCount, 0);
});
