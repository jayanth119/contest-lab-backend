import { Request, Response } from "express";
import { runCode } from "../utils/finalTestcase";
import { Question } from "../models/questionModel";
import { UserContest } from "../models/usercontestModel";
// Helper function to execute code against test cases

export const calculateScore = async (req: Request, res: Response) => {
  try {
    // Find all contest submissions that haven't been scored yet
    const userContests = await UserContest.find({ isScore: false });
    if (!userContests || userContests.length === 0) {
      return res.status(404).json({ message: "No contests pending score calculation." });
    }

    let contestsUpdated = 0;

    // Loop through each contest submission record
    for (const contest of userContests) {
      let totalScore = 0;

      // Loop through each submission within the contest
      for (let i = 0; i < contest.submissions.length; i++) {
        const submission = contest.submissions[i];

        // Retrieve the corresponding question
        const question = await Question.findById(submission.questionId);
        if (!question) {
          submission.score = 0;
          continue;
        }

        try {
          // Execute the code against the test cases using the question slug
          const result: any = await runCode(submission.code, submission.language, question.slug);

          // Calculate the score by counting successful test cases
          if (result.results) {
            const score = result.results.filter((tc: any) => tc.success).length;
            submission.score = score;
            totalScore += score;
          } else {
            submission.score = 0;
          }
        } catch (error) {
          console.error(`Error processing submission for question ${submission.questionId}:`, error);
          submission.score = 0;
        }
      }

      // Update the contest record with the total score and mark it as scored
      contest.totalScore = totalScore;
      contest.isScore = true;
      await contest.save();
      contestsUpdated++;
    }

    return res.status(200).json({ message: `Score calculated for ${contestsUpdated} contest(s).` });
  } catch (error: any) {
    console.error("Error calculating score:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
