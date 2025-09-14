// Vanilla JS for attendance app


let students = [];
let attendance = {};
let teacherId = null;
let jwtToken = null;
let tokenExpiry = null;

//let baseUrl = 'http://localhost:3000';
let baseUrl = '';





function register() {
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, })
  }).then(async res => {
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to register.');
      return;
    }
    if (data.success) {
      saveToken(data.token);
      teacherId = data.userId;
      document.getElementById('auth-tabs').style.display = 'none';
      document.getElementById('main').style.display = 'block';
      showMain();
      window.location.reload();
    }
  });
}





function login(isFromRegister = false) {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(res => res.json()).then(data => {
    if (data.success) {
      saveToken(data.token);
      teacherId = data.userId;
      localStorage.setItem('userRole', data.role || 'teacher');
      document.getElementById('auth-tabs').style.display = 'none';
      document.getElementById('main').style.display = 'block';
      document.getElementById('logoutBtn').style.display = 'block';
      // Display class name
      localStorage.setItem('teacherClass', data.className || '');
      showAllAttendanceTabIfAllowed(data.role);
      showMain();
    } else {
      if (!isFromRegister) alert('Login failed');
    }
  });
}




function addStudent() {
  if (!jwtToken || isTokenExpired()) return alert('Please login again.');
  const nameInput = document.getElementById('studentName');
  const rollInput = document.getElementById('studentRoll');
  const name = nameInput.value.trim();
  const roll = rollInput.value.trim();
  if (!name || !roll) {
    alert('Please enter both student name and roll number.');
    return;
  }
  // Check for duplicate name or roll number in current students
  const nameExists = students.some(s => s.name.toLowerCase() === name.toLowerCase());
  const rollExists = students.some(s => s.roll === roll);
  if (nameExists) {
    alert('Student name already exists.');
    return;
  }
  if (rollExists) {
    alert('Roll number already exists.');
    return;
  }
  fetch(`${baseUrl}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
    body: JSON.stringify({ name, roll })
  }).then(async res => {
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to register student.');
      return;
    }
    return res.json();
  }).then(student => {
    if (student) {
      students.push(student);
      renderStudents();
      nameInput.value = '';
      rollInput.value = '';
    }
  });
}



function loadStudents() {
  if (!jwtToken || isTokenExpired()) return;
  fetch(`${baseUrl}/api/students`, {
    headers: { 'Authorization': 'Bearer ' + jwtToken }
  }).then(res => res.json()).then(data => {
    students = data;
    renderStudents();
  });
}



function renderStudents(attendanceMap = {}) {
  const list = document.getElementById('studentsList');
  list.innerHTML = '';
  const statuses = ['present', 'sick', 'notified_absence', 'absent'];
  students.forEach(student => {
    const currentStatus = attendanceMap[student._id] || 'absent';
    const select = `<select id='status-${student._id}' class='attendance-status-select'>${statuses.map(s => `<option value='${s}'${s===currentStatus?' selected':''}>${s.replace('_', ' ')}</option>`).join('')}</select>`;
    const div = document.createElement('div');
    div.innerHTML = `${student.name} (${student.roll}) ${select} <button class='delete-btn' onclick='deleteStudent("${student._id}")' title='Delete Student'>&times;</button>`;
    list.appendChild(div);
  });
}
function deleteStudent(studentId) {
  if (!confirm('Are you sure you want to delete this student?')) return;
  fetch(`${baseUrl}/api/students/${studentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + jwtToken }
  }).then(async res => {
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to delete student.');
      return;
    }
    // Remove student from local list and re-render
    students = students.filter(s => s._id !== studentId);
    renderStudents();
    alert('Student deleted.');
  });
}





function markAttendance() {
  if (!jwtToken || isTokenExpired()) return alert('Please login again.');
  const date = document.getElementById('attendanceDate').value;
  if (!date) {
    alert('Please select a date before marking attendance.');
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) {
    alert('You cannot mark attendance for a future date.');
    return;
  }
  students.forEach(student => {
    const status = document.getElementById(`status-${student._id}`).value;
    fetch(`${baseUrl}/api/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
      body: JSON.stringify({ studentId: student._id, date, status })
    });
  });
  alert('Attendance marked!');
}
function saveToken(token) {
  jwtToken = token;
  // decode expiry from JWT (exp in seconds)
  const payload = JSON.parse(atob(token.split('.')[1]));
  tokenExpiry = payload.exp * 1000;
  localStorage.setItem('jwtToken', jwtToken);
  localStorage.setItem('tokenExpiry', tokenExpiry);
}

function isTokenExpired() {
  return !tokenExpiry || Date.now() > tokenExpiry;
}


function showMain() {
  try {
    document.getElementById('auth').style.display = 'none';
    }
    catch (e) {}
    document.getElementById('main').style.display = 'block';
    document.getElementById('teacherClass').value = localStorage.getItem('teacherClass') ? `${localStorage.getItem('teacherClass')}` : '';
    document.getElementById('classDisplay').textContent = localStorage.getItem('teacherClass') ? `Current class: ${localStorage.getItem('teacherClass')}` : '';
  setActiveTab('register');
  loadStudents();
}


function showRegisterPage() {
  if (!jwtToken || isTokenExpired()) return alert('Please login again.');
  setActiveTab('register');
  document.getElementById('printAttendanceBtn').style.display = 'none';
  document.getElementById('attendanceSheet').style.display = 'none';
}




function showAttendancePage() {
  if (!jwtToken || isTokenExpired()) return alert('Please login again.');
  setActiveTab('attendance');
  // Show floating print button
  document.getElementById('printAttendanceBtn').style.display = 'flex';
  // Set date input to current date if empty
  const dateInput = document.getElementById('attendanceDate');
  const today = new Date().toISOString().slice(0, 10);
  if (!dateInput.value) {
    dateInput.value = today;
  }
  fetchAttendanceForDate(dateInput.value);
  // Add event listener to date input
  dateInput.onchange = function() {
    fetchAttendanceForDate(dateInput.value);
  };
}

// Show All Attendance tab only for non-teacher roles
function showAllAttendanceTabIfAllowed(role) {
  const tab = document.getElementById('tab-all-attendance');
  if (role && role !== 'teacher') {
    tab.style.display = 'block';
  } else {
    tab.style.display = 'none';
  }
}

function showAllAttendancePage() {
  setActiveTab('all-attendance');
  document.getElementById('printAllAttendanceBtn').style.display = 'none';
  document.getElementById('allAttendanceSheets').innerHTML = '';
}

function fetchAllAttendanceSheets() {
  if (!jwtToken || isTokenExpired()) return alert('Please login again.');
  const date = document.getElementById('allAttendanceDate').value;
  if (!date) return alert('Please select a date.');
  fetch(`${baseUrl}/api/all-attendance/${date}`, {
    headers: { 'Authorization': 'Bearer ' + jwtToken }
  }).then(res => res.json()).then(data => {
    if (!Array.isArray(data) || data.length === 0) {
      document.getElementById('allAttendanceSheets').innerHTML = '<p>No attendance found for this date.</p>';
      document.getElementById('printAllAttendanceBtn').style.display = 'none';
      return;
    }
    
    //let html = '<h3>Attendance Sheets for ' + date + '</h3>';
    let html = '';
    data.forEach(sheet => {
      if(sheet.students.length === 0) return;
      // html += `<div class='attendance-sheet-block'><h4>Teacher: ${sheet.teacherEmail} (${sheet.className || ''})</h4>`;
      html += `<div class='attendance-sheet-block'><h2>Attendance Sheet</h2><h3 style='font-size:1rem;color:#509E2F;'>${sheet.className || ''}</h3><img src="enko-modern-logo.png" class="enko-logo"><p>Date: ${formatDate(sheet.date)} &nbsp; No: <b style='color:#509E2F;'>${sheet.students.length}</b></p>`;
      html += `<table class='attendanceSheetTable'><thead><tr><th>Name</th><th>Roll</th><th>Status</th></tr></thead><tbody>`;
      sheet.students.forEach(s => {
          html += `<tr><td>${s.name}</td><td>${s.roll}</td><td class='status-${s.status}'>${ s.status == "notified_absence" ? "Notified Absence" : s.status.charAt(0).toUpperCase() + s.status.slice(1)}</td></tr>`;
      });
      html += '</tbody></table></div>';
      html += `<div style='margin-top:32px;text-align:center;opacity:0.5;font-size:0.8rem;'>${sheet.teacherEmail}</div>`;
      html += `<div style='margin-top:8px;text-align:center;opacity:0.5;font-size:1.1rem;'>Powered by Basic Attendance</div>`;
    });
    document.getElementById('allAttendanceSheets').innerHTML = html;
    // document.getElementById('printAllAttendanceBtn').style.display = 'flex';
    document.getElementById('allSheetsViewer').style.display = 'flex';
  });
}

function printAllAttendanceSheets() {
  const printContents = document.getElementById('allAttendanceSheets').innerHTML;
  const printWindow = window.open('', '_blank');
  printWindow.document.write('<html><head><title>Print</title>');
  printWindow.document.write('<link rel="stylesheet" href="style.css">');
  printWindow.document.write('</head><body>');
  printWindow.document.write(printContents);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
}

// Format date as "12-Sept-2025"
function formatDate(dateStr) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function fetchAttendanceForDate(date) {
  fetch(`${baseUrl}/api/attendance/${date}`, {
    headers: { 'Authorization': 'Bearer ' + jwtToken }
  }).then(res => res.json()).then(data => {
    // Map attendance by studentId
    const attendanceMap = {};
    data.forEach(a => {
      attendanceMap[a.studentId] = a.status;
      /* if (a.status) attendanceMap[a.studentId] = a.status; */
    });
    renderStudents(attendanceMap);
  });
}

function printAttendanceSheet() {
  const date = document.getElementById('attendanceDate').value;
  fetch(`${baseUrl}/api/attendance/${date}`, {
    headers: { 'Authorization': 'Bearer ' + jwtToken }
  }).then(res => res.json()).then(data => {
    // Map attendance by studentId
    const attendanceMap = {};
    data.forEach(a => {
      attendanceMap[a.studentId] = a.status;
    });
    // Build sheet HTML
      let html = `<h2>Attendance Sheet</h2><h3 style='font-size:1rem;color:#509E2F;'>${localStorage.getItem('teacherClass')}</h3><img src="enko-modern-logo.png" class="enko-logo"><p>Date: ${formatDate(date)} &nbsp; No: <b style='color:#509E2F;'>${students.length}</b></p>`;
      html += `<table class='attendanceSheetTable'><thead><tr><th>Name</th><th>Roll</th><th>Status</th></tr></thead><tbody style='font-weight:500;'>`;
        students.forEach(student => {
      const status = attendanceMap[student._id] || 'absent';
          html += `<tr><td>${student.name}</td><td>${student.roll}</td><td class='status-${status}'>${ status == "notified_absence" ? "Notified Absence" : status.charAt(0).toUpperCase() + status.slice(1)}</td></tr>`;
    });
    html += `</tbody></table>`;
    html += `<div style='margin-top:32px;text-align:center;opacity:0.5;font-size:1.1rem;'>Powered by Basic Attendance</div>`;
    document.getElementById('attendanceSheet').innerHTML = html;
    document.getElementById('sheetViewer').style.display = 'flex';
  });
}

function closeSheetViewer() {
  document.getElementById('sheetViewer').style.display = 'none';
}

function closeAllSheetsViewer() {
  document.getElementById('allSheetsViewer').style.display = 'none';
}

function printSheet() {
  const printContents = document.getElementById('attendanceSheet').innerHTML;
  const originalContents = document.body.innerHTML;
  document.body.innerHTML = printContents;

  const printWindow = window.open('', '_blank');
  printWindow.document.write('<html><head><title>Print</title>');
  printWindow.document.write('<link rel="stylesheet" href="style.css">');
  printWindow.document.write('<style>.enko-logo { height: 80px; position: absolute; right: 34px; top: 24px; }</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write(printContents);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
  document.body.innerHTML = originalContents;
}

function setActiveTab(tab) {
  const registerTab = document.getElementById('tab-register');
  const attendanceTab = document.getElementById('tab-attendance');
  const allAttendanceTab = document.getElementById('tab-all-attendance');
  const registerPage = document.getElementById('registerPage');
  const attendancePage = document.getElementById('attendancePage');
  const allAttendancePage = document.getElementById('allAttendancePage');
  if (tab === 'register') {
    registerTab.classList.add('active');
    attendanceTab.classList.remove('active');
    allAttendanceTab.classList.remove('active');
    registerPage.style.display = 'block';
    attendancePage.style.display = 'none';
    allAttendancePage.style.display = 'none';
  } else if (tab === 'attendance') {
    registerTab.classList.remove('active');
    attendanceTab.classList.add('active');
    allAttendanceTab.classList.remove('active');
    registerPage.style.display = 'none';
    attendancePage.style.display = 'block';
    allAttendancePage.style.display = 'none';
  } else if (tab === 'all-attendance') {
    registerTab.classList.remove('active');
    attendanceTab.classList.remove('active');
    allAttendanceTab.classList.add('active');
    registerPage.style.display = 'none';
    attendancePage.style.display = 'none';
    allAttendancePage.style.display = 'block';
  }
}


function logout() {
  jwtToken = null;
  tokenExpiry = null;
  teacherId = null;
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('tokenExpiry');
  localStorage.removeItem('teacherClass');
  localStorage.removeItem('userRole');
  document.getElementById('main').style.display = 'none';
  document.getElementById('auth-tabs').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'none';
  showLoginTab();
  window.location.reload();
}

window.onload = function() {
  jwtToken = localStorage.getItem('jwtToken');
  tokenExpiry = parseInt(localStorage.getItem('tokenExpiry'));
  let userRole = localStorage.getItem('userRole');
  if (jwtToken && !isTokenExpired()) {
    document.getElementById('auth-tabs').style.display = 'none';
    document.getElementById('main').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    showAllAttendanceTabIfAllowed(userRole);
    showMain();
  } else {
    document.getElementById('auth-tabs').style.display = 'block';
    document.getElementById('main').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    showLoginTab();
  }
}
  
  /* jwtToken = localStorage.getItem('jwtToken');
  tokenExpiry = parseInt(localStorage.getItem('tokenExpiry'));
  if (jwtToken && !isTokenExpired()) {
    document.getElementById('auth-tabs').style.display = 'none';
    document.getElementById('main').style.display = 'block';
    showMain();
  } else {
    document.getElementById('auth-tabs').style.display = 'block';
    document.getElementById('main').style.display = 'none';
    showLoginTab();
  } */

// Tab switching for login/signup
function showLoginTab() {
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-signup').classList.remove('active');
  document.getElementById('loginTab').style.display = 'block';
  document.getElementById('signupTab').style.display = 'none';
}

function showSignupTab() {
  document.getElementById('tab-login').classList.remove('active');
  document.getElementById('tab-signup').classList.add('active');
  document.getElementById('loginTab').style.display = 'none';
  document.getElementById('signupTab').style.display = 'block';
}

function setTeacherClass() {
  const classInput = document.getElementById('teacherClass');
  const className = classInput.value.trim();
  if (!className) {
    alert('Please enter a class name.');
    return;
  }
  fetch(`${baseUrl}/api/teacher/class`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + jwtToken
    },
    body: JSON.stringify({ className })
  }).then(async res => {
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to save class name.');
      return;
    }
    localStorage.setItem('teacherClass', className);
    document.getElementById('classDisplay').textContent = className ? `Class: ${className}` : '';
    alert('Class name saved!');
  });
}
