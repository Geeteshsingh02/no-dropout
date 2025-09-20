let currentUser = null;
let studentCache = null;
let teacherCache = null;

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Login Function
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('roleSelect').value;
    
    if (!username || !password || !role) {
        alert('Please fill all fields');
        return;
    }

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
        const res = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });
        const data = await res.json();
        
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            window.location.href = 'dashboard.html';
        } else {
            alert('Login Failed: ' + (data.message || 'Invalid credentials'));
        }
    } catch (error) {
        alert('Error: Unable to connect to server');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

// Logout
function logout() {
    localStorage.clear();
    studentCache = null;
    window.location.href = 'index.html';
}

// Fetch students with caching
async function fetchStudents() {
    if (studentCache) return studentCache;
    
    try {
        const res = await fetch('http://localhost:3000/students');
        studentCache = await res.json();
        return studentCache;
    } catch (error) {
        console.error('Error fetching students:', error);
        return [];
    }
}

// Fetch teachers with caching
async function fetchTeachers() {
    if (teacherCache) return teacherCache;
    
    try {
        const res = await fetch('http://localhost:3000/teachers');
        teacherCache = await res.json();
        return teacherCache;
    } catch (error) {
        console.error('Error fetching teachers:', error);
        return [];
    }
}

// Populate Admin
async function populateAdmin() {
    const teacherList = document.getElementById('adminTeachers');
    const highRiskList = document.getElementById('adminHighRisk');
    
    teacherList.innerHTML = '<li>Loading teachers...</li>';
    highRiskList.innerHTML = '<li>Loading high-risk students...</li>';

    try {
        const [teachers, students] = await Promise.all([
            fetchTeachers(),
            fetchStudents()
        ]);

        teacherList.innerHTML = teachers.map(t => 
            `<li class="list-item">${t.username} | Subject: ${t.subject} | Section: ${t.section}</li>`
        ).join('');

        const highRisk = students.filter(s => s.risk === 'High');
        highRiskList.innerHTML = highRisk.map(s => 
            `<li class="list-item">${s.name} | Contact: ${s.contact} | Section: ${s.section}</li>`
        ).join('');

        // Render graphs
        renderAdminGraphs(students);
    } catch (error) {
        console.error('Error populating admin:', error);
        teacherList.innerHTML = '<li>Error loading teachers</li>';
        highRiskList.innerHTML = '<li>Error loading students</li>';
    }
}

function renderAdminGraphs(students) {
    // Risk distribution chart
    const riskCounts = {
        Low: students.filter(s => s.risk === 'Low').length,
        Moderate: students.filter(s => s.risk === 'Moderate').length,
        High: students.filter(s => s.risk === 'High').length
    };

    const ctxRisk = document.getElementById('adminRiskChart').getContext('2d');
    new Chart(ctxRisk, {
        type: 'pie',
        data: {
            labels: Object.keys(riskCounts),
            datasets: [{
                data: Object.values(riskCounts),
                backgroundColor: ['#059669', '#d97706', '#dc2626']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Student Risk Distribution' }
            }
        }
    });

    // Average attendance chart
    const sections = [...new Set(students.map(s => s.section))];
    const avgAttendance = sections.map(sec => {
        const secStudents = students.filter(s => s.section === sec);
        const avg = secStudents.reduce((sum, s) => sum + s.attendance, 0) / secStudents.length || 0;
        return avg.toFixed(1);
    });

    const ctxAttendance = document.getElementById('adminAttendanceChart').getContext('2d');
    new Chart(ctxAttendance, {
        type: 'bar',
        data: {
            labels: sections,
            datasets: [{
                label: 'Average Attendance (%)',
                data: avgAttendance,
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, max: 100 } },
            plugins: { title: { display: true, text: 'Average Attendance by Section' } }
        }
    });
}

// Populate Teacher
async function populateTeacher() {
    const profile = document.getElementById('teacherProfile');
    const allStudentsTable = document.querySelector('#teacherAllStudentsTable tbody');
    const highRiskTable = document.querySelector('#teacherHighRiskTable tbody');
    const updateTable = document.querySelector('#teacherUpdateTable tbody');
    
    profile.innerHTML = `Username: ${currentUser.username}<br>Subject: ${currentUser.subject}<br>Section: ${currentUser.section}`;
    allStudentsTable.innerHTML = '<tr><td colspan="6">Loading students...</td></tr>';
    highRiskTable.innerHTML = '<tr><td colspan="4">Loading high-risk students...</td></tr>';
    updateTable.innerHTML = '<tr><td colspan="5">Loading students...</td></tr>';

    try {
        const students = await fetchStudents();
        const myStudents = students.filter(s => s.section === currentUser.section);
        const highRisk = myStudents.filter(s => s.risk === 'High');

        // All students table
        allStudentsTable.innerHTML = myStudents.map(s => {
            const subs = Object.keys(s.subjects).join(', ');
            const latestMarks = Object.values(s.subjects).map(marks => marks.slice(-1)[0]).join(', ');
            return `
                <tr class="table-row">
                    <td>${s.name}</td>
                    <td>${subs}</td>
                    <td>${latestMarks}</td>
                    <td>${s.attendance}%</td>
                    <td class="${s.risk.toLowerCase()}">${s.risk}</td>
                    <td>${s.feesPaid ? 'Paid' : 'Not Paid'}</td>
                </tr>
            `;
        }).join('');

        highRiskTable.innerHTML = highRisk.map(s => `
            <tr class="table-row">
                <td>${s.name}</td>
                <td>${Object.keys(s.subjects).join(', ')}</td>
                <td>${s.attendance}%</td>
                <td class="${s.risk.toLowerCase()}">${s.risk}</td>
            </tr>
        `).join('');

        // Update table
        updateTable.innerHTML = myStudents.map(s => {
            const currentMarks = s.subjects[currentUser.subject] ? s.subjects[currentUser.subject].slice(-1)[0] : '';
            return `
                <tr class="table-row">
                    <td>${s.name}</td>
                    <td><input type="number" class="update-marks" value="${currentMarks}" min="0" max="100" placeholder="Marks"></td>
                    <td><input type="number" class="update-attendance" value="${s.attendance}" min="0" max="100" placeholder="Attendance"></td>
                    <td>
                        <select class="update-fees">
                            <option value="true" ${s.feesPaid ? 'selected' : ''}>Paid</option>
                            <option value="false" ${!s.feesPaid ? 'selected' : ''}>Not Paid</option>
                        </select>
                    </td>
                    <td><button onclick="updateSingleStudent('${s.name}', this)" class="btn-green">Save</button></td>
                </tr>
            `;
        }).join('');

        // Render teacher graph
        renderTeacherGraph(myStudents);
    } catch (error) {
        console.error('Error populating teacher:', error);
        allStudentsTable.innerHTML = '<tr><td colspan="6">Error loading students</td></tr>';
        highRiskTable.innerHTML = '<tr><td colspan="4">Error loading students</td></tr>';
        updateTable.innerHTML = '<tr><td colspan="5">Error loading students</td></tr>';
    }
}

function renderTeacherGraph(students) {
    const ctx = document.getElementById('teacherChart').getContext('2d');
    
    // Average marks in teacher's subject
    const subject = currentUser.subject;
    const marksData = students
        .filter(s => s.subjects[subject])
        .map(s => s.subjects[subject].slice(-1)[0]);
    
    const avgMark = marksData.reduce((sum, m) => sum + m, 0) / marksData.length || 0;
    
    // Simple bar for average
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Average Marks in ' + subject],
            datasets: [{
                label: 'Average',
                data: [avgMark.toFixed(2)],
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, max: 100 } },
            plugins: { title: { display: true, text: 'Class Performance in My Subject' } }
        }
    });
}

// Update Single Student
async function updateSingleStudent(name, btn) {
    const row = btn.closest('tr');
    const marks = parseInt(row.querySelector('.update-marks').value);
    const attendance = parseInt(row.querySelector('.update-attendance').value);
    const feesPaid = row.querySelector('.update-fees').value === 'true';

    if (isNaN(marks) || isNaN(attendance)) {
        alert('Please enter valid numbers for marks and attendance');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await fetch('http://localhost:3000/update-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, subject: currentUser.subject, marks, attendance, feesPaid })
        });
        
        if (res.ok) {
            studentCache = null; // Invalidate cache
            alert('Student Updated');
            populateTeacher();
        } else {
            alert('Update Failed');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        alert('Error: Unable to update student');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

// Populate Mentor
async function populateMentor() {
    const list = document.getElementById('mentorList');
    list.innerHTML = '<li>Loading high-risk students...</li>';

    try {
        const students = await fetchStudents();
        const highRisk = students.filter(s => s.risk === 'High');
        list.innerHTML = highRisk.map(s => 
            `<li class="list-item">${s.name} | Section: ${s.section} | Contact: ${s.contact}</li>`
        ).join('');
    } catch (error) {
        console.error('Error populating mentor:', error);
        list.innerHTML = '<li>Error loading students</li>';
    }
}

// Populate Student
async function populateStudent() {
    const profile = document.getElementById('studentProfile');
    const tbody = document.querySelector('#studentTable tbody');
    const attendance = document.getElementById('studentAttendance');
    const risk = document.getElementById('studentRisk');
    
    profile.innerHTML = 'Loading profile...';
    tbody.innerHTML = '<tr><td colspan="2">Loading marks...</td></tr>';

    try {
        const students = await fetchStudents();
        const s = students.find(st => st.name === currentUser.username);
        
        if (!s) {
            profile.innerHTML = 'Error: Student not found';
            return;
        }

        profile.innerHTML = `Name: ${s.name}<br>Section: ${s.section}<br>Contact: ${s.contact}`;
        attendance.innerHTML = `Attendance: ${s.attendance}%`;
        risk.innerHTML = `Risk Level: ${s.risk}`;
        
        tbody.innerHTML = Object.entries(s.subjects).map(([sub, marksArr]) => `
            <tr class="table-row">
                <td>${sub}</td>
                <td>${marksArr.join(', ')} (Latest: ${marksArr.slice(-1)[0]})</td>
            </tr>
        `).join('');

        // Render chart
        renderStudentChart(s);
    } catch (error) {
        console.error('Error populating student:', error);
        profile.innerHTML = 'Error loading profile';
        tbody.innerHTML = '<tr><td colspan="2">Error loading marks</td></tr>';
    }
}

function renderStudentChart(student) {
    const ctx = document.getElementById('studentChart').getContext('2d');
    const labels = Object.keys(student.subjects);
    const data = labels.map(l => student.subjects[l].slice(-1)[0]);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Latest Marks',
                data,
                backgroundColor: '#3b82f6',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100 }
            },
            plugins: {
                title: { display: true, text: 'Performance in Subjects' }
            }
        }
    });
}

// On dashboard load
window.onload = async () => {
    currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Hide tabs
    document.querySelector('.tabs').style.display = 'none';

    // Show relevant dashboard
    const dashboardId = currentUser.role;
    document.getElementById(dashboardId).classList.add('active');

    // Lazy load Chart.js if needed
    if (['admin', 'teacher', 'student'].includes(currentUser.role) && typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => initDashboard();
        document.head.appendChild(script);
    } else {
        initDashboard();
    }
};

async function initDashboard() {
    try {
        switch (currentUser.role) {
            case 'admin':
                await populateAdmin();
                break;
            case 'teacher':
                await populateTeacher();
                break;
            case 'mentor':
                await populateMentor();
                break;
            case 'student':
                await populateStudent();
                break;
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Error loading dashboard');
    }
}