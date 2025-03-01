import mongoose from "mongoose";
import { runCode } from "../controller/runCode";
import { Request, Response } from "express";
import { Question } from "../models/questionModel";

const { Schema } = mongoose;

const userContestSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  contestId: {
    type: Schema.Types.ObjectId,
    ref: "Contest",
    required: true,
  },
  submissions: [
    {
      questionId: {
        type: Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      },
      language: {
        type: String,
        required: true,
      },
      code: {
        type: String,
        required: true,
      },
      submissionTime: {
        type: Date,
        default: Date.now,
      },
      isSubmitted: {
        type: Boolean,
        default: false,
      },
      timeTaken: {
        type: Number,
        default: 0, // in seconds
      },
      score: {
        type: Number,
        default: 0, // Added score field
      },
    },
  ],
  isCompleted: {
    type: Boolean,
    default: false,
  },
  isScore :{
    type: Boolean,
    default: false,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
});

// Helper function to execute code
const executeCode = async (code: string, language: string, questionId: string) => {
  return new Promise((resolve, reject) => {
    const mockReq = {
      body: { code, language, slug: questionId },
    } as Request;

    const mockRes = {
      status: (statusCode: number) => ({
        json: (data: any) => resolve(data),
      }),
    } as unknown as Response;

    runCode(mockReq, mockRes).catch(reject);
  });
};

// **Pre-save Middleware to Evaluate Code and Store Score**
userContestSchema.pre("save", async function (next) {
  const userContest = this as any;

  let modified = false; // Track if submissions were updated

  for (let i = 0; i < userContest.submissions.length; i++) {
    const submission = userContest.submissions[i];

    try {
      const question = await Question.findById(submission.questionId);
      if (!question) {
        userContest.submissions[i].score = 0;
        modified = true;
        continue;
      }

      const result: any = await executeCode(submission.code, submission.language, question.slug);

      if (result.results) {
        userContest.submissions[i].score = result.results.filter((testCase: any) => testCase.success).length;
      } else {
        userContest.submissions[i].score = 0; // No test cases passed
      }

      modified = true;
    } catch (error) {
      console.error(`Error processing submission for question ${submission.questionId}:`, error);
      userContest.submissions[i].score = 0;
      modified = true;
    }
  }

  if (modified) {
    userContest.markModified("submissions"); // Ensure Mongoose detects changes
  }

  next();
});

export const UserContest = mongoose.model("UserContest", userContestSchema);
