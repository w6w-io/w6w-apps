import { assert, assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { errorBody, mockCtx, page, pathOf, queryOf, USER } from "../_helpers.ts";

Deno.test("user-list: GETs the users collection with no auth header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: page([USER]) }]);
  await userList.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/users");
  assertEquals(calls[0].headers.authorization, undefined);
});

/**
 * Brex's wire names, one by one — including the bracketed multi-value ones,
 * which are the literal parameter names (`?status[]=ACTIVE,INVITED`), not a
 * convention this app invented.
 */
Deno.test("user-list: every filter maps to Brex's own parameter name", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await userList.execute({
    name: "Ada",
    email: "ada@example.com",
    remoteDisplayId: "ada.lovelace",
    emails: "a@example.com,b@example.com",
    statuses: ["ACTIVE", "INVITED"],
    managerIds: "m1,m2",
    departmentIds: "d1",
    locationIds: "l1",
    titleIds: "t1",
    costCenterIds: "c1",
    legalEntityIds: "e1",
    customFields: "cost_owner:opt_1",
    loadCustomFields: false,
    limit: 5,
    cursor: "cursor_1",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    name: "Ada",
    email: "ada@example.com",
    remote_display_id: "ada.lovelace",
    "email[]": "a@example.com,b@example.com",
    "status[]": "ACTIVE,INVITED",
    "manager_id[]": "m1,m2",
    "department_id[]": "d1",
    "location_id[]": "l1",
    "title_id[]": "t1",
    "cost_center_id[]": "c1",
    "legal_entity_id[]": "e1",
    "custom_field[]": "cost_owner:opt_1",
    load_custom_fields: "false",
    limit: "5",
    cursor: "cursor_1",
  });
});

Deno.test("user-list: an unset param is absent from the wire, not empty", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await userList.execute({ limit: 100 }, ctx);

  assertEquals(queryOf(calls[0].url), { limit: "100" });
});

Deno.test("user-list: the page comes back normalized with a count", async () => {
  const { ctx } = mockCtx([{ body: page([USER], "cursor_2") }]);
  const result = await userList.execute({}, ctx) as {
    items: Array<Record<string, unknown>>;
    next_cursor: string | null;
    count: number;
  };

  assertEquals(result.count, 1);
  assertEquals(result.next_cursor, "cursor_2");
  assertEquals(result.items[0].email, "ada@example.com");
});

Deno.test("user-list: the search type and the empty-param default are declared", () => {
  assertEquals(userList.type, "search");
  assertEquals(userList.key, "user-list");
  assertEquals(userList.params?.find((p) => p.key === "limit")?.default, 100);
});

Deno.test("user-list: a Brex error surfaces with its type", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("FORBIDDEN", "Not permitted") }]);
  let message = "";
  try {
    await userList.execute({}, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Brex 403 FORBIDDEN"), message);
});
