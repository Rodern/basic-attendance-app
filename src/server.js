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

// Serve static files (HTML, CSS, JS) from the src directory
const path = require('path');
app.use(express.static(path.join(__dirname)));

const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

const MONGODB_URI = `mongodb+srv://alainkimbu_db_user:${MONGODB_PASSWORD}@cluster0.y3eseqm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';



const ALLOWED_ROLES = ['admin', 'developer', 'teacher', 'hr'];
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  className: { type: String, default: '' },
  role: { type: String, enum: ALLOWED_ROLES, default: 'teacher' }
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


const ATTENDANCE_STATUSES = ['present', 'sick', 'notified_absence', 'absent', 'late', 'transferred'];
const AttendanceSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  teacherId: mongoose.Schema.Types.ObjectId, // Reference to User
  date: { type: String, required: true }, // Store only date string (e.g. '2025-09-12')
  status: { type: String, enum: ATTENDANCE_STATUSES, default: 'absent' }
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
  const { email, password, role } = req.body;
  const userRole = ALLOWED_ROLES.includes(role) ? role : 'teacher';
  try {
  const user = new User({ email, password, role: userRole });
    await user.save();
  // Issue JWT that expires at the coming midnight of teacher's local time
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight
  const expiresInSeconds = Math.floor((midnight.getTime() - now.getTime()) / 1000);
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: expiresInSeconds });
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
  // Issue JWT that expires at the coming midnight of teacher's local time
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight
  const expiresInSeconds = Math.floor((midnight.getTime() - now.getTime()) / 1000);
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: expiresInSeconds });
  res.json({ success: true, token, userId: user._id, className: user.className || '', role: user.role });
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

// Update student details
app.put('/api/students/:id', authenticateToken, async (req, res) => {
  const teacherId = req.user.userId;
  const studentId = req.params.id;
  const { name, roll } = req.body;
  try {
    const student = await Student.findOneAndUpdate(
      { _id: studentId, teacherId },
      { name, roll },
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ error: 'Student not found or not authorized.' });
    }
    res.json({ success: true, student });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Roll number must be unique for this teacher.' });
    } else {
      res.status(500).json({ error: 'Failed to update student.' });
    }
  }
});


// Attendance routes

app.post('/api/attendance', authenticateToken, async (req, res) => {
  const { studentId, date, status } = req.body;
  const teacherId = req.user.userId;
  if (!ATTENDANCE_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid attendance status.' });
  }
  try {
    // Upsert attendance for student/date
    const attendance = await Attendance.findOneAndUpdate(
      { studentId, date },
      { studentId, teacherId, date, status },
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

// Get all teachers' attendance for a given date (non-teacher roles only)
app.get('/api/all-attendance/:date', authenticateToken, async (req, res) => {
  const { date } = req.params;
  const userId = req.user.userId;
  const user = await User.findById(userId);
  if (!user || user.role === 'teacher') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  // Find all teachers
  const teachers = await User.find({ role: 'teacher' });
  // For each teacher, get their students and attendance for the date
  const results = await Promise.all(teachers.map(async teacher => {
    const students = await Student.find({ teacherId: teacher._id });
    // Get attendance for these students on the given date
    const attendanceRecords = await Attendance.find({ teacherId: teacher._id, date });

    if(attendanceRecords.length === 0) {
      return {
        teacherEmail: teacher.email,
        className: teacher.className,
        date: date,
        students: []
      };
    }

    // Map attendance by studentId
    const attendanceMap = {};
    attendanceRecords.forEach(a => { attendanceMap[a.studentId] = a.status; });
    // Build student attendance list
    const studentList = students.map(s => ({
      name: s.name,
      roll: s.roll,
      status: attendanceMap[s._id] || 'absent'
    }));
    return {
      teacherEmail: teacher.email,
      className: teacher.className,
      date: date,
      students: studentList
    };
  }));
  res.json(results);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
