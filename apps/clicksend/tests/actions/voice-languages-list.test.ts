import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/voice-languages-list.ts";

Deno.test("voice-languages-list: returns the raw language array, GET /voice/lang", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "Here are the possible languages.",
        data: [
          { code: "en-us", country: "English, US", gender: ["female", "male"] },
          { code: "en-in", country: "English, India", gender: "female" },
        ],
      },
    },
  ]);
  const result = await action.execute({}, ctx) as { languages: Array<{ gender?: unknown }> };
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/voice/lang");
  assertEquals(result.languages.length, 2);
  assertEquals(result.languages[1].gender, "female");
});
