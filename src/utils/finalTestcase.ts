import axios from "axios";
import fs from "fs";
import { JDOODLE_CLIENT_ID, JDOODLE_CLIENT_SECRET } from "../config"; 

if (!JDOODLE_CLIENT_ID || !JDOODLE_CLIENT_SECRET) {
  throw new Error("JDoodle client ID and secret must be defined.");
}
import { Question as QuestionModel } from "../models/questionModel";

const JDOODLE_URL = "https://api.jdoodle.com/v1/execute";

// Define API request payload
interface JdoodleRequest {
  clientId: string;
  clientSecret: string;
  script: string;
  stdin: string;
  language: string;
  versionIndex: string;
}

// Define API response structure
interface JdoodleResponse {
  output?: string;
  statusCode?: number;
  memory?: string;
  cpuTime?: string;
  error?: string;
}

// Run submitted code helper function
export const runCode = async (
  code: string,
  language: string,
  slug: string
): Promise<{ message: string; results: { input: string; output: string; expected: string; success: boolean }[] }> => {
  // Validate input parameters
  if (!code || !language || !slug) {
    throw new Error("Missing required fields.");
  }

  // Mapping for supported languages and JDoodle parameters
  const suppLangAndVIndex: Record<
    string,
    { languageCode: string; versionIndex: number }
  > = {
    java: { languageCode: "java", versionIndex: 5 },
    c: { languageCode: "c", versionIndex: 6 },
    "c++": { languageCode: "cpp", versionIndex: 6 },
    python: { languageCode: "python3", versionIndex: 5 },
    javascript: { languageCode: "nodejs", versionIndex: 6 },
  };

  const langDetails = suppLangAndVIndex[language];
  if (!langDetails) {
    throw new Error(`Unsupported language: ${language}`);
  }
  const { languageCode, versionIndex } = langDetails;

  // Find the question by slug
  const question = await QuestionModel.findOne({ slug });
  if (!question) {
    throw new Error("Question not found.");
  }

  // Prepare input and expected output files (for debugging purposes)
  const inputsArray = question.testCases.map((tc) => tc.input.trim());
  const expectedOutputsArray = question.testCases.map((tc) => (tc.expected ? tc.expected.trim() : "null"));

  fs.writeFileSync("input.txt", inputsArray.join("\n"), "utf8");
  fs.writeFileSync("expected_output.txt", expectedOutputsArray.join("\n"), "utf8");

  try {
    // Build JDoodle payload
    const payload: JdoodleRequest = {
      clientId: JDOODLE_CLIENT_ID!,
      clientSecret: JDOODLE_CLIENT_SECRET!,
      script: code,
      stdin: inputsArray.join("\n"),
      language: languageCode,
      versionIndex: versionIndex.toString(),
    };

    console.log("JDoodle Request:", payload);
    const response = await axios.post<JdoodleResponse>(JDOODLE_URL, payload);
    console.log("JDoodle Response:", response.data);

    const output = response.data.output?.trim() || "";
    const outputArray = output.split("\n");

    const results: { input: string; output: string; expected: string; success: boolean }[] = [];

    // Loop through each test case and compare outputs
    for (let i = 0; i < question.testCases.length; i++) {
      const input = question.testCases[i].input;
      const expected = question.testCases[i].expected;
      const caseOutput = outputArray[i]?.trim() || "";

      // Save each output to a file (for debugging)
      fs.appendFileSync("output.txt", `${caseOutput}\n`, "utf8");

      // Normalize strings by removing all whitespace for comparison
      const normalize = (str: string) => str.replace(/\s+/g, "");
      if (normalize(caseOutput) !== normalize(expected)) {
        // Throw an error if a test case fails
        throw new Error(
          `Logical Error on test case: input: ${input}, expected: ${expected}, got: ${caseOutput}`
        );
      }
      results.push({ input, output: caseOutput, expected, success: true });
    }

    return {
      message: "Code executed successfully for all test cases.",
      results,
    };
  } catch (error: any) {
    throw new Error(`Error during code execution: ${error.message}`);
  }
};
