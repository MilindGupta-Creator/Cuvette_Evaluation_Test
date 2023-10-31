const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const PORT = process.env.PORT || 3100;
dotenv.config();

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('./public'));
app.use(cookieParser());
app.use(cors({ origin: `${process.env.REACT_URL}`, credentials: true }));



const User = require("./models/user.js");
const Quiz = require("./models/quiz.js");
const AuthController = require("./contollers/AuthController.js");


app.get("/health", (req, res) => {
  res.json({ message: "Server is working" });
});

app.get("/", (req, res) => {
  res.json({ message: "Response sended from Home page" });
});

//signup api
app.post("/api/signup",AuthController.signup);

app.post("/api/login", AuthController.login);

app.post("/api/logout", (req, res) => {
  res.cookie("jwt", "", { expires: new Date(0) });
  res.status(200).json({ message: "Logged out successfully" });
});

app.post("/api/createquiz", async (req, res) => {
  try {
    const { email, quizName, quizType, questions } = req.body; 
    const newQuiz = new Quiz({
      email,quizName, quizType, questions, date: new Date(),
    });
   

    await newQuiz.save();
    res.json({ message: "Quiz created successfully", id: newQuiz._id });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
  // console.log(authHeader);
  jwt.verify(token, "bhaibhaibhai", (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(403).json({ message: "Forbidden: Invalid token" });
    }

    req.user = user;
    next();
  });
};

app.get('/api/isloggedin', isAuthenticated, (req, res) => {
  if (req.user) res.json({ isLoggedIn: true, user: { email: req.user.email } });
  else res.json({ isLoggedIn: false });
});

app.get("/api/quizzes", async (req, res) => {
  try {
    const { email } = req.query;
    const quizzes = await Quiz.find({ email });
    res.json(quizzes);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

app.post("/api/quiz/:quizId/impression", async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.quizId, { $inc: { impressions: 1 } });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ message: "Impression recorded" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


app.get("/api/userData", async (req, res) => {
  const { email } = req.query;

  try {
    const quizzes = await Quiz.find({ email: email });
    const totalQuizzes = quizzes.length;
    const totalQuestions = quizzes.reduce((sum, quiz) => {
      return (
        sum +
        quiz.questions.reduce((questionSum, questionSet) => {
          return questionSum + Object.keys(questionSet.pollQuestion).length;
        }, 0)
      );
    }, 0);
    const totalImpressions = quizzes.reduce(
      (sum, quiz) => sum + quiz.impressions,
      0
    );

    res.json({
      quizzes: totalQuizzes,
      questions: totalQuestions,
      impressions: totalImpressions,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching user data" });
  }
});


app.get("/api/trendingQuizzes", async (req, res) => {
  const { email } = req.query;

  try {
    // Find top 10 quizzes created by the user, sorted by impressions in descending order
    const quizzes = await Quiz.find({ email: email })
      .sort({ impressions: -1 })
      .limit(6)
      .select('quizName impressions date');

    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching trending quizzes:', error);
    res.status(500).json({ error: 'An error occurred while fetching trending quizzes' });
  }
});

//answerOption update api
app.post('/api/quiz/:quizId/submit', async (req, res) => {
  const { quizId } = req.params;
  const { userAnswers } = req.body;

  try {
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.quizType !== "Poll Type") {
      Object.keys(userAnswers).forEach((questionIndex) => {
        if (userAnswers[questionIndex] === 1) {
          if (quiz.correctAnswers[questionIndex]) {
            quiz.correctAnswers[questionIndex]++;
          } else {
            quiz.correctAnswers[questionIndex] = 1;
          }
        }
      });
    }

    quiz.impressions++;

    await quiz.save();

    res.json({ message: 'Quiz answers submitted successfully' });
  } catch (error) {
    console.error('Error submitting quiz answers:', error);
    res.status(500).json({ error: 'An error occurred while submitting quiz answers' });
  }
});

const quizRouter = require("./routes/quizQuestions");
app.use("/api/quiz", quizRouter);


app.listen(PORT, () => {
  mongoose
    .connect("mongodb+srv://milindji:milind1234@quizzie.qbpvksb.mongodb.net/?retryWrites=true&w=majority", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log(`Server running on http://localhost:${PORT}`))
    .catch((error) => console.error(error));
});

