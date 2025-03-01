import express from "express";
import { isAuthenticated } from "../middleware/authMiddleware";
var  { calculateScore } =  require("../controller/scoreCalculate") ;
const  router = express.Router();
var {createContest} = require('../controller/createContest');
var { joinContest } = require('../controller/joinContest');
var {stopContest} = require('../controller/stopContest');
var {submitContest} = require('../controller/submitContest');

router.post('/create',isAuthenticated, createContest);
router.post('/join', joinContest);
router.post('/stop', stopContest);
router.post('/contest/submit', submitContest);
router.get('/score', calculateScore)
export default router;