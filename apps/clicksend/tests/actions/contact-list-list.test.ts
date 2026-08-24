import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list-list.ts";

Deno.test("contact-list-list: GETs /lists and unwraps the page", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "ok",
        data: {
          total: 1,
          per_page: 15,
          current_page: 1,
          last_page: 1,
          data: [{ list_id: 428, list_name: "List1", _contacts_count: 0 }],
        },
      },
    },
  ]);
  const result = await action.execute({}, ctx) as { lists: unknown[]; total: number };
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/lists");
  assertEquals(result.lists.length, 1);
  assertEquals(result.total, 1);
});
