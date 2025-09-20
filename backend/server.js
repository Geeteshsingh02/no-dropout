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

// LOGIN API
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(usersFile));
    const user = users.find(u => u.username === username && u.password === password);
    if(user){
        res.json({ success: true, role: user.role, username: user.username });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

// GET STUDENTS
app.get('/students', (req,res)=>{
    const students = JSON.parse(fs.readFileSync(studentsFile));
    res.json(students);
});

// ADD MARKS / ATTENDANCE
app.post('/update-student', (req,res)=>{
    const { studentName, subject, marks, attendance } = req.body;
    const students = JSON.parse(fs.readFileSync(studentsFile));
    const student = students.find(s=>s.name === studentName);
    if(student){
        student.subjects[subject] = marks;
        student.attendance = attendance;
        fs.writeFileSync(studentsFile, JSON.stringify(students, null, 2));
        res.json({ success: true });
    } else res.json({ success:false, message:'Student not found' });
});

// START SERVER
app.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`));
