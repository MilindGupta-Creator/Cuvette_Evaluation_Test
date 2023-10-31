const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/user");

const signup = async (req,res)=>{
    try {
        const { name, email, password } = req.body;
        if (!password) return res.status(400).json({ message: 'Password is required' });
        const hashedPassword = await bcrypt.hash(password, 10);
    
        let user = await User.findOne({ email });
        if (user) {
          return res.json({ message: "User already exists" });
        } else {
          const newUser = new User({
            name,
            email,
            password: hashedPassword,
          });
          await newUser.save();
    
          // Generate JWT
          const jwToken = jwt.sign(newUser.toJSON(), "bhaibhaibhai", {
            expiresIn: "24h",
          });
    
          res.cookie('jwt', jwToken, { sameSite: 'None', secure: true });
    
          return res.redirect(302, "http://localhost:3000/adminpanel");
        }
      }  catch (error) {
        return res.status(500).json({ message: 'An error occurred', error: error.message });
      }
};

const login = async (req, res) => { 
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      const passwordMatched = await bcrypt.compare(password, user.password);
      if (passwordMatched) {
        const jwToken = jwt.sign(user.toJSON(), "bhaibhaibhai", {
          expiresIn: "1h",
        });
        res.cookie("jwt", jwToken, {
          sameSite: "None",
          secure: true,
        });
        res.redirect(302, "http://localhost:3000/adminpanel");
        return;
      } else {
        res.json({
          status: "FAIL",
          message: "Incorrect password",
        });
      }
    } else {
      res.json({
        status: "FAIL",
        message: "User does not exist",
      });
    }
  } catch (error) {
    // console.log(error);
    res.json({
      status: "FAIL",
      message: "Something went wrong",
      error,
    });
  }
};

module.exports = {signup,login};
