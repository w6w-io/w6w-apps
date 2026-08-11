import { assert, assertEquals } from "@std/assert";
import action from "../../actions/create-field.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-field: POSTs the simple variant for text/number/date", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { tag: "Hometown" } }]);
  await action.execute!({
    listId: "l1",
    label: "What is your hometown?",
    tag: "Hometown",
    type: "text",
    fallback: "Unknown",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/fields");
  assertEquals(JSON.parse(calls[0].body!), {
    label: "What is your hometown?",
    tag: "Hometown",
    type: "text",
    fallback: "Unknown",
  });
});

Deno.test("create-field: sends `choices` only for the choice variants", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }, { status: 201, body: {} }]);
  await action.execute!({
    listId: "l1",
    label: "Pick one",
    tag: "Pick",
    type: "choice_single",
    choices: ["One", "Two"],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).choices, ["One", "Two"]);

  // The request body is a oneOf discriminated by `type`; `choices` alongside
  // `text` matches neither branch, so it is dropped rather than sent.
  await action.execute!({
    listId: "l1",
    label: "Free text",
    tag: "Free",
    type: "text",
    choices: ["One", "Two"],
  }, ctx);
  assert(!("choices" in JSON.parse(calls[1].body!)));
});

Deno.test("create-field: omits fallback when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ listId: "l1", label: "L", tag: "T", type: "number" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), ["label", "tag", "type"]);
});
