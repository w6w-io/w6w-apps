import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/client-list.ts";

Deno.test("client-list: GETs /users/clients under the connection's accountId, page defaulted to 1", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { clients: [] } } } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/accounting/account/acc1/users/clients");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("client-list: forwards perPage and wraps search filters as search[name]", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { clients: [] } } } }]);
  await action.execute({ page: 2, perPage: 50, search: { email: "a@b.com" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "50");
  assertEquals(url.searchParams.get("search[email]"), "a@b.com");
});
