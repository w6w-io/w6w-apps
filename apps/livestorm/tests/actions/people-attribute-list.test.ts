import { assertEquals } from "@std/assert";
import peopleAttributeList from "../../actions/people-attribute-list.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

Deno.test("people-attribute-list: GETs /people_attributes with sort and filters", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("people_attributes", "a1")]) }]);
  await peopleAttributeList.execute({ sort: "-created_at", builtin: true, type: "email" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/people_attributes");
  assertEquals(queryOf(calls[0].url), {
    sort: "-created_at",
    "filter[builtin]": "true",
    "filter[type]": "email",
  });
});
