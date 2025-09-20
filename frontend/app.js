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

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Login Function
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('roleSelect').value;
    
    if (!username || !password || !role) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

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
            showNotification('Login successful!', 'success');
            window.location.href = 'dashboard.html';
        } else {
            showNotification('Login Failed: ' + (data.message || 'Invalid credentials'), 'error');
        }
    } catch (error) {
        showNotification('Error: Unable to connect to server', 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
}

// Logout
function logout() {
    localStorage.clear();
    studentCache = null;
    teacherCache = null;
    showNotification('Logged out successfully', 'success');
    window.location.href = 'index.html';
}

// Fetch students with caching
async function fetchStudents() {
    if (studentCache) return studentCache;
    
    try {
        const res = await fetch('http://localhost:3000/students');
        if (!res.ok) throw new Error('Failed to fetch students');
        studentCache = await res.json();
        return studentCache;
    } catch (error) {
        showNotification('Error fetching students', 'error');
        return [];
    }
}

// Fetch teachers with caching
async function fetchTeachers() {
    if (teacherCache) return teacherCache;
    
    try {
        const res = await fetch('http://localhost:3000/teachers');
        if (!res.ok) throw new Error('Failed to fetch teachers');
        teacherCache = await res.json();
        return teacherCache;
    } catch (error) {
        showNotification('Error fetching teachers', 'error');
        return [];
    }
}

// Sort table by column
function sortTable(tableId, colIndex, type = 'string') {
    const table = document.getElementById(tableId);
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        let aVal = a.cells[colIndex].textContent;
        let bVal = b.cells[colIndex].textContent;
        
        if (type === 'number') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
            return aVal - bVal;
        } else {
            return aVal.localeCompare(bVal);
        }
    });

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

// Populate Admin
async function populateAdmin() {
    const teacherList = document.getElementById('adminTeachers');
    const highRiskList = document.getElementById('adminHighRisk');
    
    teacherList.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> Loading teachers...</li>';
    highRiskList.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> Loading high-risk students...</li>';

    try {
        const [teachers, students] = await Promise.all([
            fetchTeachers(),
            fetchStudents()
        ]);

        teachers.sort((a, b) => a.username.localeCompare(b.username));

        teacherList.innerHTML = teachers.map(t => 
            `<li class="list-item">${t.username} | Subject: ${t.subject} | Section: ${t.section} | Email: ${t.email}</li>`
        ).join('');

        const highRisk = students.filter(s => s.risk === 'High').sort((a, b) => a.name.localeCompare(b.name));
        highRiskList.innerHTML = highRisk.map(s => 
            `<li class="list-item">${s.name} | Contact: ${s.contact} | Section: ${s.section} | Email: ${s.email}</li>`
        ).join('');

        renderAdminGraphs(students);
    } catch (error) {
        console.error('Error populating admin:', error);
        teacherList.innerHTML = '<li>Error loading teachers</li>';
        highRiskList.innerHTML = '<li>Error loading students</li>';
    }
}

function renderAdminGraphs(students) {
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
                backgroundColor: ['#059669', '#d97706', '#dc2626'],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 14 } } },
                title: { display: true, text: 'Student Risk Distribution', font: { size: 18 } },
                tooltip: { enabled: true }
            },
            animation: { duration: 1000 }
        }
    });

    const sections = [...new Set(students.map(s => s.section))].sort();
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
                backgroundColor: '#3b82f6',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            scales: { 
                y: { beginAtZero: true, max: 100, grid: { color: '#e5e7eb' } },
                x: { grid: { display: false } }
            },
            plugins: { 
                title: { display: true, text: 'Average Attendance by Section', font: { size: 18 } },
                tooltip: { enabled: true }
            },
            animation: { duration: 1000 }
        }
    });
}

// Populate Teacher
async function populateTeacher() {
    const profile = document.getElementById('teacherProfile');
    const allStudentsTable = document.querySelector('#teacherAllStudentsTable tbody');
    const highRiskTable = document.querySelector('#teacherHighRiskTable tbody');
    const updateTable = document.querySelector('#teacherUpdateTable tbody');
    
    profile.innerHTML = `
        <strong>Username:</strong> ${currentUser.username}<br>
        <strong>Full Name:</strong> ${currentUser.fullName}<br>
        <strong>Subject:</strong> ${currentUser.subject}<br>
        <strong>Section:</strong> ${currentUser.section}<br>
        <strong>Email:</strong> ${currentUser.email}
    `;
    allStudentsTable.innerHTML = '<tr><td colspan="6"><i class="fas fa-spinner fa-spin"></i> Loading students...</td></tr>';
    highRiskTable.innerHTML = '<tr><td colspan="4"><i class="fas fa-spinner fa-spin"></i> Loading high-risk students...</td></tr>';
    updateTable.innerHTML = '<tr><td colspan="5"><i class="fas fa-spinner fa-spin"></i> Loading students...</td></tr>';

    try {
        const students = await fetchStudents();
        let myStudents = students.filter(s => s.section === currentUser.section).sort((a, b) => a.name.localeCompare(b.name));
        const highRisk = myStudents.filter(s => s.risk === 'High');

        allStudentsTable.innerHTML = myStudents.map(s => {
            const subs = Object.keys(s.subjects).sort().join(', ');
            const latestMarks = s.subjects[currentUser.subject] ? s.subjects[currentUser.subject].slice(-1)[0] : 'N/A';
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
                <td>${Object.keys(s.subjects).sort().join(', ')}</td>
                <td>${s.attendance}%</td>
                <td class="${s.risk.toLowerCase()}">${s.risk}</td>
            </tr>
        `).join('');

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
                    <td><button onclick="updateSingleStudent('${s.id}', '${s.name}', this)" class="btn-green"><i class="fas fa-save"></i> Save</button></td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('#teacherAllStudentsTable th').forEach((th, index) => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => sortTable('teacherAllStudentsTable', index, index === 3 ? 'number' : 'string'));
        });
        document.querySelectorAll('#teacherHighRiskTable th').forEach((th, index) => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => sortTable('teacherHighRiskTable', index, index === 2 ? 'number' : 'string'));
        });

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
    const subject = currentUser.subject;
    const marksData = students
        .filter(s => s.subjects[subject])
        .map(s => s.subjects[subject].slice(-1)[0]);
    
    const avgMark = marksData.length ? (marksData.reduce((sum, m) => sum + m, 0) / marksData.length).toFixed(2) : 0;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [`Average Marks in ${subject}`],
            datasets: [{
                label: 'Average',
                data: [avgMark],
                backgroundColor: '#3b82f6',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            scales: { 
                y: { beginAtZero: true, max: 100, grid: { color: '#e5e7eb' } },
                x: { grid: { display: false } }
            },
            plugins: { 
                title: { display: true, text: `Class Performance in ${subject}`, font: { size: 18 } },
                tooltip: { enabled: true }
            },
            animation: { duration: 1000 }
        }
    });
}

// Update Single Student
async function updateSingleStudent(id, name, btn) {
    const row = btn.closest('tr');
    const marks = parseInt(row.querySelector('.update-marks').value);
    const attendance = parseInt(row.querySelector('.update-attendance').value);
    const feesPaid = row.querySelector('.update-fees').value === 'true';

    if (isNaN(marks) || isNaN(attendance)) {
        showNotification('Please enter valid numbers for marks and attendance', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const res = await fetch('http://localhost:3000/update-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name, subject: currentUser.subject, marks, attendance, feesPaid })
        });
        
        if (res.ok) {
            studentCache = null;
            showNotification(`Updated ${name} successfully`, 'success');
            populateTeacher();
        } else {
            showNotification('Update Failed', 'error');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showNotification('Error: Unable to update student', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save';
    }
}

// Populate Mentor
async function populateMentor() {
    const list = document.getElementById('mentorList');
    list.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> Loading high-risk students...</li>';

    try {
        const students = await fetchStudents();
        let highRisk = students.filter(s => s.risk === 'High').sort((a, b) => a.name.localeCompare(b.name));
        list.innerHTML = highRisk.map(s => 
            `<li class="list-item">${s.name} | Section: ${s.section} | Contact: ${s.contact} | Email: ${s.email}</li>`
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
    
    profile.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading profile...';
    tbody.innerHTML = '<tr><td colspan="2"><i class="fas fa-spinner fa-spin"></i> Loading marks...</td></tr>';

    try {
        const students = await fetchStudents();
        const s = students.find(st => st.name === currentUser.username);
        
        if (!s) {
            profile.innerHTML = 'Error: Student not found';
            return;
        }

        profile.innerHTML = `
            <strong>Name:</strong> ${s.name}<br>
            <strong>Section:</strong> ${s.section}<br>
            <strong>Contact:</strong> ${s.contact}<br>
            <strong>Email:</strong> ${s.email}
        `;
        attendance.innerHTML = `Attendance: ${s.attendance}%`;
        risk.innerHTML = `Risk Level: ${s.risk}`;
        
        const subjects = Object.entries(s.subjects).sort(([a], [b]) => a.localeCompare(b));
        tbody.innerHTML = subjects.map(([sub, marksArr]) => `
            <tr class="table-row">
                <td>${sub}</td>
                <td>${marksArr.join(', ')} (Latest: ${marksArr.slice(-1)[0] || 'N/A'})</td>
            </tr>
        `).join('');

        document.querySelectorAll('#studentTable th').forEach((th, index) => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => sortTable('studentTable', index, 'string'));
        });

        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => renderStudentChart(s);
            document.head.appendChild(script);
        } else {
            renderStudentChart(s);
        }
    } catch (error) {
        console.error('Error populating student:', error);
        profile.innerHTML = 'Error loading profile';
        tbody.innerHTML = '<tr><td colspan="2">Error loading marks</td></tr>';
    }
}

function renderStudentChart(student) {
    const ctx = document.getElementById('studentChart').getContext('2d');
    const labels = Object.keys(student.subjects).sort();
    const data = labels.map(l => student.subjects[l].slice(-1)[0] || 0);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Latest Marks',
                data,
                backgroundColor: labels.map((_, i) => `hsl(${i * 60}, 70%, 50%)`),
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                y: { beginAtZero: true, max: 100, grid: { color: '#e5e7eb' } },
                x: { grid: { display: false } }
            },
            plugins: { 
                title: { display: true, text: 'Performance in Subjects', font: { size: 18 } },
                tooltip: { enabled: true }
            },
            animation: { duration: 1000 }
        }
    });
}

window.onload = async () => {
    currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    document.querySelector('.tabs').style.display = 'none';
    const dashboardId = currentUser.role;
    document.getElementById(dashboardId).classList.add('active');

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
        showNotification('Error loading dashboard', 'error');
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    document.querySelector('.dark-mode-toggle i').className = `fas fa-${isDark ? 'sun' : 'moon'}`;
}

window.addEventListener('load', () => {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.querySelector('.dark-mode-toggle i').className = 'fas fa-sun';
    }
});