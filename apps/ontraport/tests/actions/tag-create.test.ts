import { assertEquals } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-create: calls POST /1/Tags, form-urlencoded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ tag_id: "1", tag_name: "api_tag" }) }]);
  await tagCreate.execute({ tagName: "api_tag" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/Tags");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("tag_name"), "api_tag");
});

Deno.test("tag-create: defaults object_type_id to 0 (Contact) when omitted from the wire, per the vendor default", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await tagCreate.execute({ tagName: "api_tag", objectTypeId: 0 }, ctx);
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("object_type_id"), "0");
});
