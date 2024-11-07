const express = require('express');
const path = require('path');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const autenthicationRoutes = require('./routes/authenticationRoutes'); 
const scheduleRoutes = require('./routes/weeklyScheduleRoutes');
const resetRoutes = require('./routes/resetRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const monthlyScheduleRoutes = require('./routes/monthlyScheduleRoutes');
const adminRoutes = require('./routes/adminRoutes');
const examRoutes = require('./routes/examRoutes');
const defineAssociations = require('./models/associations');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://192.168.0.105:5173', 'https://linkandlearn.fpenonori.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

defineAssociations();
app.use(express.json());
app.use('/reset', resetRoutes);
app.use('/students', studentRoutes);
app.use('/teachers', teacherRoutes);
app.use('/authentication', autenthicationRoutes);
app.use('/subject', subjectRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/reservation', reservationRoutes);
app.use('/classes', monthlyScheduleRoutes);
app.use('/admins', adminRoutes);
app.use('/exam', examRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

module.exports = app;
