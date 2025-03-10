import express from "express";
import {  runCode } from '../controller/runCode';
import { submitCode } from '../controller/submitCode';
import { question, getspecificquestion } from '../controller/getspecificquestion';
import { addQuestion } from "../controller/addQuestion";
import { isAuthenticated } from "../middleware/authMiddleware";
const router = express.Router();

router.get("/questions", question);
router.get("/questions/:id", getspecificquestion);
router.post("/questions/add",addQuestion);
router.post("/run", isAuthenticated,runCode);
router.post("/submit", submitCode);

export default router;