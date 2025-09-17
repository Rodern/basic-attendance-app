# Basic Attendance

Basic Attendance is a modern web application for teachers and school staff to manage student attendance efficiently. It provides secure authentication, class management, student registration and editing, daily attendance marking with multiple status options, printable attendance sheets, and admin/HR features for viewing all teachers' attendance.

## Features
- **Role-Based Authentication:** Secure login and signup using school email and password. Roles include teacher, admin, developer, and HR/Management.
- **Class Management:** Teachers can set and update their class name, which is saved in the database.
- **Student Registration & Editing:** Add, edit, or delete students with unique names and roll numbers. Duplicate entries are prevented.
- **Attendance Marking:** Mark daily attendance for each student with status options: Present, Sick, Notified Absence, Absent. Attendance is unique per student per date.
- **Attendance History:** View and print attendance sheets for any selected date, styled for clarity and professionalism.
- **All Teachers Attendance (Admin/HR):** Non-teacher roles can view and print attendance sheets for all teachers for any date, with each teacher's list separated onto a new print page.
- **Floating Print Button:** Easily print the attendance sheet for the selected date from the attendance tab.
- **Watermark:** Attendance sheets include a watermark: "Powered by Basic Attendance".
- **Responsive UI:** Tabbed navigation, floating action button, modern glassmorphism-inspired design, and styled dropdowns for attendance status.
- **Security:** JWT-based authentication, CORS enabled, and environment variables for sensitive data.

## Tech Stack
- **Frontend:** Vanilla JavaScript, HTML, CSS (glassmorphism, responsive design)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT (JSON Web Token)

## Setup Instructions
1. **Clone the repository:**
   ```
   git clone <your-repo-url>
   cd basic-attendance/src
   ```
2. **Install dependencies:**
   ```
   npm install
   ```
3. **Configure environment variables:**
   - Create a `.env` file in `src` with your MongoDB connection string and JWT secret:
     ```
     MONGODB_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_secret
     ```
4. **Start the server:**
   ```
   node server.js
   ```
5. **Open `index.html` in your browser** to use the app locally.

## Usage
- **Login/Signup:** Use your school email and password to log in or create an account. Role determines access to features.
- **Set Class Name:** On the register page, set your class name. It will be saved to your teacher profile.
- **Register & Edit Students:** Add students with unique names and roll numbers. Edit or delete students as needed.
- **Mark Attendance:** Switch to the attendance tab, select a date (cannot be in the future), and select a status for each student (Present, Sick, Notified Absence, Absent).
- **Print Attendance:** Click the floating print button to view and print the attendance sheet for the selected date.
- **All Teachers Attendance:** Admin/HR/Developer roles can view and print all teachers' attendance for any date, with each teacher's list on a separate print page.

## Folder Structure
```
basic-attendance/
  src/
    app.js         # Frontend logic
    server.js      # Backend server
    style.css      # App styles
    index.html     # Main UI
    .env           # Environment variables
    .gitignore     # Git ignore rules
    README.md      # Project documentation
```

## Contributing
Pull requests and suggestions are welcome! Please open an issue for major changes.

## License
This project is open source and available under the MIT License.
