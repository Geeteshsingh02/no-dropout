const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const usersFile = './users.json';
const studentsFile = './students.json';

// --------- LOGIN ---------
app.post('/login', (req, res) => {
    const { username, password, role } = req.body;
    const users = JSON.parse(fs.readFileSync(usersFile));
    const user = users.find(u => u.username === username && u.password === password && u.role === role);
    if(user) res.json({ success: true });
    else res.json({ success: false, message:'Invalid credentials' });
});

// --------- GET STUDENTS ---------
app.get('/students', (req, res) => {
    const students = JSON.parse(fs.readFileSync(studentsFile));
    res.json(students);
});

// --------- UPDATE STUDENT DATA ---------
app.post('/update-student', (req, res) => {
    const { name, subject, marks, attendance } = req.body;
    let students = JSON.parse(fs.readFileSync(studentsFile));
    let student = students.find(s => s.name === name);
    if(!student) {
        student = {name, subjects:{}, attendance, risk:'Safe', counseling:[]};
        students.push(student);
    }
    student.subjects[subject] = marks;
    student.attendance = attendance;
    // calculate risk
    const avg = Object.values(student.subjects).reduce((a,b)=>a+b,0)/Object.keys(student.subjects).length;
    if(avg<50 || attendance<50) student.risk='High';
    else if(avg<65 || attendance<75) student.risk='Moderate';
    else student.risk='Safe';
    fs.writeFileSync(studentsFile, JSON.stringify(students,null,2));
    res.json({ success:true, student });
});

// --------- ADD COUNSELING ---------
app.post('/add-counseling', (req,res)=>{
    const { name, note } = req.body;
    let students = JSON.parse(fs.readFileSync(studentsFile));
    const student = students.find(s=>s.name===name);
    if(student){
        student.counseling.push(note);
        fs.writeFileSync(studentsFile, JSON.stringify(students,null,2));
        res.json({ success:true });
    } else res.json({ success:false, message:'Student not found' });
});

// --------- START SERVER ---------
app.listen(PORT, ()=>console.log(`Server running at http://localhost:${PORT}`));
