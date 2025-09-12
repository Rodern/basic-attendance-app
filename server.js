
// Basic Express server for attendance app

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*', credentials: false }));
app.use(bodyParser.json());

mongoose.connect('mongodb+srv://alainkimbu_db_user:3cX5wzElKqGghgxB@cluster0.y3eseqm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';



const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  className: { type: String, default: '' }
});
// Update teacher class name
app.post('/api/teacher/class', authenticateToken, async (req, res) => {
  const { className } = req.body;
  const teacherId = req.user.userId;
  try {
    const user = await User.findByIdAndUpdate(teacherId, { className }, { new: true });
    res.json({ success: true, className: user.className });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update class name.' });
  }
});

// Delete student
app.delete('/api/students/:id', authenticateToken, async (req, res) => {
    const teacherId = req.user.userId;
    const studentId = req.params.id;
    try {
        const student = await Student.findOneAndDelete({ _id: studentId, teacherId });
        if (!student) {
            return res.status(404).json({ error: 'Student not found or not authorized.' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete student.' });
    }
});


const StudentSchema = new mongoose.Schema({
  name: String,
  roll: { type: String, required: true },
  teacherId: mongoose.Schema.Types.ObjectId // Reference to User
});
StudentSchema.index({ roll: 1, teacherId: 1 }, { unique: true });


const AttendanceSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  teacherId: mongoose.Schema.Types.ObjectId, // Reference to User
  date: { type: String, required: true }, // Store only date string (e.g. '2025-09-12')
  present: Boolean
});
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);
const Student = mongoose.model('Student', StudentSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Auth routes

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = new User({ email, password });
    await user.save();
    // Issue JWT after registration
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '60m' });
    res.json({ success: true, token, userId: user._id });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Email already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to register teacher.' });
    }
  }
});


app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) {
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '5m' });
    res.json({ success: true, token, userId: user._id, className: user.className || '' });
  } else {
    res.status(401).json({ success: false });
  }
});

// Student routes

app.post('/api/students', authenticateToken, async (req, res) => {
  const { name, roll } = req.body;
  const teacherId = req.user.userId;
  try {
    const student = new Student({ name, roll, teacherId });
    await student.save();
    res.json(student);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Roll number must be unique for this teacher.' });
    } else {
      res.status(500).json({ error: 'Failed to register student.' });
    }
  }
});

app.get('/api/students', authenticateToken, async (req, res) => {
  const teacherId = req.user.userId;
  const students = await Student.find({ teacherId });
  res.json(students);
});

// Attendance routes

app.post('/api/attendance', authenticateToken, async (req, res) => {
  const { studentId, date, present } = req.body;
  const teacherId = req.user.userId;
  try {
    // Upsert attendance for student/date
    const attendance = await Attendance.findOneAndUpdate(
      { studentId, date },
      { studentId, teacherId, date, present },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark attendance.' });
  }
});


app.get('/api/attendance/:date', authenticateToken, async (req, res) => {
  const teacherId = req.user.userId;
  const { date } = req.params;
  const attendance = await Attendance.find({ teacherId, date });
  res.json(attendance);
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
