import { assertEquals } from "@std/assert";
import listPeople from "../../actions/list-people.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-people: calls GET /people/v2/people and maps attributes", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: collection(
        "Person",
        [
          {
            id: "1",
            attributes: {
              first_name: "Jane",
              last_name: "Doe",
              name: "Jane Doe",
              status: "active",
            },
          },
        ],
        { total_count: 1 },
      ),
    },
  ]);
  const out = await listPeople.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/people/v2/people");
  assertEquals(out.people, [
    {
      id: "1",
      firstName: "Jane",
      lastName: "Doe",
      name: "Jane Doe",
      status: "active",
      createdAt: undefined,
      updatedAt: undefined,
      avatar: undefined,
    },
  ]);
  assertEquals(out.totalCount, 1);
});

Deno.test("list-people: search maps to where[search_name_or_email_or_phone_number]", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("Person", []) }]);
  await listPeople.execute({ search: "jane" }, ctx);

  assertEquals(queryOf(calls[0].url)["where[search_name_or_email_or_phone_number]"], "jane");
});

Deno.test("list-people: defaults per_page to 25 and offset to 0", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("Person", []) }]);
  await listPeople.execute({}, ctx);

  const q = queryOf(calls[0].url);
  assertEquals(q["per_page"], "25");
  assertEquals(q["offset"], "0");
});

Deno.test("list-people: pagination meta surfaces the next offset", async () => {
  const { ctx } = mockCtx([{
    body: collection("Person", [], { total_count: 200, next: { offset: 25 } }),
  }]);
  const out = await listPeople.execute({}, ctx);

  assertEquals(out.nextOffset, 25);
  assertEquals(out.totalCount, 200);
});
