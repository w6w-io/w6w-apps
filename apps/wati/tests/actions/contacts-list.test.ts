import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-list.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("contacts-list: GETs /contacts with pagination", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { contact_list: [], page_number: 1, page_size: 20 } }],
    conn,
  );
  const out = await action.execute({ pageNumber: 1, pageSize: 20 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://live-mt-server.wati.io/12345/api/ext/v3/contacts?page_number=1&page_size=20",
  );
  assertEquals(out, { contact_list: [], page_number: 1, page_size: 20 });
});
