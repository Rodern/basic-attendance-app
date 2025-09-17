// Vanilla JS for attendance app
// Utility to handle network button state and spinner
function setNetworkButtonLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  const spinner = btn.querySelector('.spinner');
  const text = btn.querySelector('.btn-text');
  if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
  if (text) text.style.opacity = isLoading ? '0.7' : '1';
}


let students = [];
let attendance = {};
let teacherId = null;
let jwtToken = null;
let tokenExpiry = null;

//let baseUrl = 'http://localhost:3000';
let baseUrl = '';


/* function register() {
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
} */

function register() {
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const btn = document.getElementById('signupBtn');
  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }
  // School email validation: must end with @enkoeducation.com
  const schoolEmailRegex = /^[^@\s]+@enkoeducation\.com$/i;
  if (!schoolEmailRegex.test(email)) {
    alert('Please use your school email ending with @enkoeducation.com.');
    return;
  }
  setNetworkButtonLoading(btn, true);
  fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(async res => {
      setNetworkButtonLoading(btn, false);
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
    })
    .catch(err => {
      setNetworkButtonLoading(btn, false);
      alert('Network error. Please try again.');
    });
}


function login(isFromRegister = false) {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('submitBtn');
  setNetworkButtonLoading(btn, true);
  fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      setNetworkButtonLoading(btn, false);
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
    })
    .catch(err => {
      setNetworkButtonLoading(btn, false);
      alert('Network error. Please try again.');
    });
}




function addStudent() {
  if (!jwtToken || isTokenExpired()) return alert('Please login again.');
  const nameInput = document.getElementById('studentName');
  const rollInput = document.getElementById('studentRoll');
  const name = nameInput.value.trim();
  const roll = rollInput.value.trim();
  const btn = document.getElementById('addStudentBtn');
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
  setNetworkButtonLoading(btn, true);
  fetch(`${baseUrl}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
    body: JSON.stringify({ name, roll })
  })
    .then(async res => {
      setNetworkButtonLoading(btn, false);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to register student.');
        return;
      }
      return res.json();
    })
    .then(student => {
      if (student) {
        students.push(student);
        renderStudents();
        nameInput.value = '';
        rollInput.value = '';
      }
    })
    .catch(err => {
      setNetworkButtonLoading(btn, false);
      alert('Network error. Please try again.');
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
  const statuses = ['present', 'sick', 'notified_absence', 'absent', 'late', 'transferred'];
  students.forEach(student => {
    const currentStatus = attendanceMap[student._id] || 'absent';
    const select = `<select id='status-${student._id}' class='attendance-status-select'>${statuses.map(s => `<option value='${s}'${s===currentStatus?' selected':''}>${s.replace('_', ' ')}</option>`).join('')}</select>`;
    const div = document.createElement('div');
    div.innerHTML = `
      <span id='student-name-${student._id}'>${student.name}</span> <span class='student-roll' id='student-roll-${student._id}'>(${student.roll})</span>
      ${select}
      <button class='edit-btn' onclick='editStudent("${student._id}")' title='Edit Student'>✏️</button>
      <button class='delete-btn' onclick='deleteStudent("${student._id}")' title='Delete Student'>&times;</button>
      <span id='edit-fields-${student._id}' style='display:none;'>
        <input type='text' id='edit-name-${student._id}' value='${student.name}' style='margin-left:8px;min-width:180px; width: auto; max-width: 300px;'>
        <input type='text' id='edit-roll-${student._id}' value='${student.roll}' style='width:80px;'>
        <br/>
        <button onclick='saveStudentEdit("${student._id}")' class='save-btn'>Save</button>
        <button onclick='cancelStudentEdit("${student._id}")' class='cancel-btn'>Cancel</button>
      </span>
    `;
    list.appendChild(div);
  });
}

function editStudent(studentId) {
  document.querySelectorAll('.attendance-status-select, .edit-btn, .delete-btn').forEach(sel => sel.style.display = 'none');
  document.getElementById(`student-name-${studentId}`).style.display = 'none';
  document.getElementById(`student-roll-${studentId}`).style.display = 'none';
  document.getElementById(`edit-fields-${studentId}`).style.display = 'inline';
}

function cancelStudentEdit(studentId) {
  document.querySelectorAll('.edit-btn, .delete-btn').forEach(sel => sel.style.display = 'flex');
  document.querySelectorAll('.attendance-status-select').forEach(sel => sel.style.display = 'inline-flex');
  document.getElementById(`student-name-${studentId}`).style.display = 'inline';
  document.getElementById(`student-roll-${studentId}`).style.display = 'inline';
  document.getElementById(`edit-fields-${studentId}`).style.display = 'none';
}

function saveStudentEdit(studentId) {
  const name = document.getElementById(`edit-name-${studentId}`).value.trim();
  const roll = document.getElementById(`edit-roll-${studentId}`).value.trim();
  if (!name || !roll) {
    alert('Please enter both name and roll number.');
    return;
  }
  fetch(`${baseUrl}/api/students/${studentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
    body: JSON.stringify({ name, roll })
  }).then(async res => {
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to update student.');
      return;
    }
    // Update local students list and re-render
    students = students.map(s => s._id === studentId ? { ...s, name, roll } : s);
    renderStudents();
    alert('Student updated!');
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
  const btn = document.getElementById('markAttendanceBtn');
  if (!date) {
    alert('Please select a date before marking attendance.');
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) {
    alert('You cannot mark attendance for a future date.');
    return;
  }
  setNetworkButtonLoading(btn, true);
  Promise.all(students.map(student => {
    const status = document.getElementById(`status-${student._id}`).value;
    return fetch(`${baseUrl}/api/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
      body: JSON.stringify({ studentId: student._id, date, status })
    });
  }))
    .then(() => {
      setNetworkButtonLoading(btn, false);
      alert('Attendance marked!');
    })
    .catch(err => {
      setNetworkButtonLoading(btn, false);
      alert('Network error. Please try again.');
    });
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
  const btn = document.getElementById('getSheetsBtn');
  if (!date) return alert('Please select a date.');
  setNetworkButtonLoading(btn, true);
  fetch(`${baseUrl}/api/all-attendance/${date}`, {
    headers: { 'Authorization': 'Bearer ' + jwtToken }
  })
    .then(res => res.json())
    .then(data => {
      setNetworkButtonLoading(btn, false);
      if (!Array.isArray(data) || data.length === 0) {
        document.getElementById('allAttendanceSheets').innerHTML = '<p>No attendance found for this date.</p>';
        document.getElementById('printAllAttendanceBtn').style.display = 'none';
        return;
      }
      let html = '';
      data.forEach(sheet => {
        if(sheet.students.length === 0) return;
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
      document.getElementById('allSheetsViewer').style.display = 'flex';
    })
    .catch(err => {
      setNetworkButtonLoading(btn, false);
      alert('Network error. Please try again.');
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
  const btn = document.getElementById('printSheetBtn');
  setNetworkButtonLoading(btn, true);
  try {
    const printContents = document.getElementById('attendanceSheet').innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;

    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Print</title>');
    printWindow.document.write('<link rel="stylesheet" href="style.css">');
    printWindow.document.write('<style>body {background-color: white;}.enko-logo { height: 80px; position: absolute; right: 34px; top: 24px; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContents);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
    document.body.innerHTML = originalContents;
  } catch (e) {
    alert('Print failed.');
  }
  setTimeout(() => setNetworkButtonLoading(btn, false), 800); // restore after short delay
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
  const btn = document.getElementById('saveClassBtn');
  if (!className) {
    alert('Please enter a class name.');
    return;
  }
  setNetworkButtonLoading(btn, true);
  fetch(`${baseUrl}/api/teacher/class`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + jwtToken
    },
    body: JSON.stringify({ className })
  })
    .then(async res => {
      const data = await res.json();
      setNetworkButtonLoading(btn, false);
      if (!res.ok) {
        alert(data.error || 'Failed to save class name.');
        return;
      }
      localStorage.setItem('teacherClass', className);
      document.getElementById('classDisplay').textContent = className ? `Class: ${className}` : '';
      alert('Class name saved!');
    })
    .catch(err => {
      setNetworkButtonLoading(btn, false);
      alert('Network error. Please try again.');
    });
}
