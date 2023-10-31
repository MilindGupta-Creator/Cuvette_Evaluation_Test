const express = require('express');
const router = express.Router();
const Quiz = require('../models/quiz');

const handleQuizOperation = async (req, res, operation) => {
  try {
    const quiz = await operation(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(operation === Quiz.findByIdAndDelete ? { message: 'Quiz deleted successfully' } : quiz);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

router.get("/:quizId", async (req, res) => handleQuizOperation(req, res, Quiz.findById));
router.delete("/:quizId", async (req, res) => handleQuizOperation(req, res, Quiz.findByIdAndDelete));

module.exports = router;
