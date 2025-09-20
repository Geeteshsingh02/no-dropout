// LOGIN
async function login(){
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('roleSelect').value;
  const res = await fetch('http://localhost:3000/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,password,role})
  });
  const data = await res.json();
  if(data.success){
    currentUser = {username,role};
    document.getElementById('loginPage').style.display='none';
    document.getElementById('platform').style.display='block';
    if(role==='teacher'){ switchDashboard('teacher', document.querySelector('.tabs button')); fillTeacher(); }
    if(role==='mentor'){ switchDashboard('mentor', document.querySelectorAll('.tabs button')[1]); fillMentor(); }
    if(role==='student'){ switchDashboard('student', document.querySelectorAll('.tabs button')[2]); fillStudent(username); }
  } else alert('Invalid credentials');
}

// FETCH STUDENTS
async function fetchStudents(){
  const res = await fetch('http://localhost:3000/students');
  return await res.json();
}

// ADD MARKS
async function addMarks(){
  const name = document.getElementById('teacherStudentName').value;
  const subject = document.getElementById('teacherSubject').value;
  const marks = Number(document.getElementById('teacherMarks').value);
  const attendance = Number(document.getElementById('teacherAttendance').value);
  const res = await fetch('http://localhost:3000/update-student',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name,subject,marks,attendance})
  });
  const data = await res.json();
  fillTeacher();
}

// ADD COUNSELING
async function addCounsel(){
  const note = document.getElementById('counselNotes').value;
  const studentName = prompt("Enter student name for counseling note:");
  await fetch('http://localhost:3000/add-counseling',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:studentName,note})
  });
  fillMentor();
}

// FILL TEACHER TABLE
async function fillTeacher(){
  const students = await fetchStudents();
  const tbody = document.querySelector('#teacherTable tbody');
  tbody.innerHTML='';
  students.forEach(s=>{
    const tr = document.createElement('tr');
    const sub = Object.entries(s.subjects).map(e=>`${e[0]}:${e[1]}`).join(', ');
    tr.innerHTML=`<td>${s.name}</td><td>${sub}</td><td>${s.attendance}%</td><td class="${s.risk.toLowerCase()}">${s.risk}</td>`;
    tbody.appendChild(tr);
  });
}

// FILL MENTOR
async function fillMentor(){
  const students = await fetchStudents();
  const list = document.getElementById('mentorList');
  list.innerHTML='';
  students.filter(s=>s.risk!=='Safe').forEach(s=>{
    const li = document.createElement('li');
    li.textContent=`${s.name} - ${s.risk} Risk`;
    li.className=s.risk.toLowerCase();
    list.appendChild(li);
  });
}

// FILL STUDENT
async function fillStudent(username){
  const students = await fetchStudents();
  const student = students.find(s=>s.name===username) || students[0];
  const tbody = document.querySelector('#studentTable tbody');
  tbody.innerHTML='';
  Object.entries(student.subjects).forEach(([sub,mark])=>{
    const tr = document.createElement('tr');
    tr.innerHTML=`<td>${sub}</td><td>${mark}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('studentAttendance').textContent=`Attendance: ${student.attendance}%`;
  document.getElementById('studentRisk').textContent=`Risk Level: ${student.risk}`;

  const ctx = document.getElementById('studentChart').getContext('2d');
  if(window.studentChart) window.studentChart.destroy();
  window.studentChart = new Chart(ctx,{
    type:'bar',
    data:{labels:Object.keys(student.subjects),datasets:[{label:'Marks',data:Object.values(student.subjects),backgroundColor:'#3b82f6'}]},
    options:{responsive:true, scales:{y:{beginAtZero:true,max:100}}}
  });
}
