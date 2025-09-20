const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Data files
const usersFile = './users.json';
const studentsFile = './students.json';

// --------- Helper: Risk Calculation ---------
function calculateSchoolRisk(student){
    let riskScore = 0;
    if(student.attendance < 75) riskScore++;
    if(!student.feesPaid) riskScore++;
    let decreasing=0;
    for(let sub in student.subjects){
        let marks = student.subjects[sub];
        if(marks.length>=2 && marks[marks.length-2]-marks[marks.length-1]>=10) decreasing++;
    }
    if(decreasing>0) riskScore++;
    if(riskScore>=2) return "High";
    if(riskScore===1) return "Moderate";
    return "Safe";
}

// --------- LOGIN ---------
app.post('/login', (req,res)=>{
    const {username,password,role} = req.body;
    const users = JSON.parse(fs.readFileSync(usersFile));
    const user = users.find(u=>u.username===username && u.password===password && u.role===role);
    if(user) res.json({success:true,user});
    else res.json({success:false,message:"Invalid credentials"});
});

// --------- GET STUDENTS ---------
app.get('/students', (req,res)=>{
    const students = JSON.parse(fs.readFileSync(studentsFile));
    res.json(students);
});

// --------- UPDATE STUDENT ---------
app.post('/update-student',(req,res)=>{
    const { name, subject, marks, attendance, feesPaid } = req.body;
    let students = JSON.parse(fs.readFileSync(studentsFile));
    let student = students.find(s=>s.name===name);
    if(!student){
        student = {name,subjects:{},attendance,feesPaid,risk:'Safe',counseling:[],section:'A'};
        students.push(student);
    }
    if(!student.subjects[subject]) student.subjects[subject]=[];
    student.subjects[subject].push(marks);
    student.attendance = attendance;
    student.feesPaid = feesPaid;
    student.risk = calculateSchoolRisk(student);
    fs.writeFileSync(studentsFile, JSON.stringify(students,null,2));
    res.json({success:true,student});
});

// --------- ADMIN: GET TEACHERS AND SECTIONS ---------
app.get('/teachers', (req,res)=>{
    const users = JSON.parse(fs.readFileSync(usersFile));
    const teachers = users.filter(u=>u.role==='teacher');
    res.json(teachers);
});

// --------- START SERVER ---------
app.listen(PORT, ()=>console.log(`Server running at http://localhost:${PORT}`));
