const request = require('supertest');
const app = require('../app');
const Teacher = require('../models/teacherModel');
const Subject = require('../models/subjectModel');
const SubjectTeacher = require('../models/subjectTeacherModel');
const bcrypt = require('bcrypt');
const Schedule = require('../models/weeklyScheduleModel');
const MonthlySchedule = require('../models/monthlyScheduleModel');
const Student = require('../models/studentModel')
const Reservation = require('../models/reservationModel');
const { updateTeacherSubjects } = require('../controllers/teacherController');
const { Sequelize } = require('sequelize');
const jwt = require('jsonwebtoken');




describe('Teacher API', () => { 

    let teacherID;
    let teacherToken;
    let studentToken;
    const teacherFirstName = 'John';
    const teacherLastName = 'Doe';
    const teacherEmail = 'testTeacher1@example.com';
    const oldPassword = 'oldpassword';
    let secondTeacherID;
    let studentId;
    const secondTeacherEmail ='john.doeUnicoMail@example.com';
    const studentEmail = 'jane.doeUnicoMail@example.com';
    let scheduleId;
    let subjectId;
    let firstTeacherMonthlySchedule;
    jest.setTimeout(20000);
    
    beforeAll(async () => {

        studentToken = jwt.sign({ email: studentEmail, role: 'STUDENT' }, process.env.JWT_AUTH_SECRET, { expiresIn: '1h' });
        teacherToken = jwt.sign({ email: teacherEmail, role: 'TEACHER' }, process.env.JWT_AUTH_SECRET, { expiresIn: '1h' });
        const hashedOldPassword = await bcrypt.hash(oldPassword, 10);
        subjectTest = await Subject.create({
            subjectname: 'authSubjectTest'
        });
        subjectTestID = subjectTest.subjectid;
        const teacher = await Teacher.create({ firstname: teacherFirstName, lastname: teacherLastName, email: teacherEmail, password: hashedOldPassword});
        teacherID = teacher.teacherid;

        const secondteacher = await Teacher.create(
          { firstname: 'John', lastname: 'Doe', email: 'john.doeUnicoMail@example.com', password: 'password' });
        secondTeacherID = secondteacher.teacherid;
      
        const student = await Student.create(
          { firstname: 'Jane', lastname: 'Doe', email: 'jane.doeUnicoMail@example.com', password: 'password' });
        studentId = student.studentid;
      
        const schedule = await Schedule.create(
          { start_time: '09:00:00',
            end_time: '10:00:00',
            teacherid: secondTeacherID,
            dayofweek: 1,
            maxstudents: 1 });
        scheduleId = schedule.weeklyscheduleid;
        
        firstTeacherMonthlySchedule = await MonthlySchedule.create({
          datetime: "2023-05-29 10:00:00", //quizas esta fecha cause problemas
          teacherid: secondTeacherID,

        });
        firstTeacherMonthlyScheduleId = firstTeacherMonthlySchedule.monthlyscheduleid
        const subject = await Subject.create(
          { subjectname: 'Mathematics' });
        subjectId = subject.subjectid;

    });

    
    afterAll(async () => {
      await SubjectTeacher.destroy({ where: { teacherid: teacherID } });
      await Teacher.destroy({ where: { email: teacherEmail } });
      await Teacher.destroy({ where: { email: secondTeacherEmail } });
      await Student.destroy({ where: { email: studentEmail} });
      await Subject.destroy({ where: { subjectname: 'authSubjectTest' } });
    });

  it('Should get a teacher by id', async () => {
    await Teacher.create({
      firstname: 'Prof. Peñoñori',
      lastname: 'Peñoñori',
      email: 'peñoñori1234@asd.com',
      password: 'password',
    });

    const response = await request(app)
      .get(`/teachers/${teacherID}`)
      .set('Authorization', `Bearer ${teacherToken}`);
  
    expect(response.status).toBe(200);
    expect(response.body.email).toBe(teacherEmail);
    await Teacher.destroy({ where: { email: 'peñoñori1234@asd.com'}});
  });

  it('Should not get a teacher by invalid id', async () => {
    const response = await request(app)
      .get('/teachers/112358')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Teacher not found');
  });

  it("Should update teacher's name", async () => {
    const updatedTeacherData = {
      firstname: 'Jack',
      lastname: 'Smith',
    };

    const response = await request(app)
      .put(`/teachers/update/${teacherID}`)
      .send(updatedTeacherData)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(200);
    expect(response.body.firstname).toBe('Jack');
    expect(response.body.lastname).toBe('Smith');
  });

  it("Should delete a teacher", async () => {
    const response = await request(app)
    .delete(`/teachers/delete/${teacherID}`)
    .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(200);
    const teacherFound = await Teacher.findByPk(teacherID);
    expect(teacherFound).toBeNull();
  });

  it("Should not be possible to update a teacher with invalid id", async () => {
    const response = await request(app)
      .put('/teachers/update/112358')
      .send({
        name: 'invalidId',
        lastname: 'invalidId',
        subjects: [],
      })
      .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(404);
  });

  it("Should not be possible to delete a teacher with invalid id", async () => {
    const response = await request(app)
    .delete('/teachers/delete/112358').set('Authorization', `Bearer ${teacherToken}`);
    expect(response.status).toBe(404);
  });

  it("Should assign a subject to a teacher", async () => {

    const newTeacher = await Teacher.create({ firstname: 'John', lastname: 'Doe', email: 'testNewTeacher123@example.com', password: 'password'});
    const testSubject = await Subject.create({
      subjectname: 'newTestSubject1'
    });

    const response = await request(app)
      .post(`/teachers/assign-subject/${newTeacher.teacherid}`)
      .send({
        subjectid: `${testSubject.subjectid}`, 
      })
      .set('Authorization', `Bearer ${teacherToken}`);
      
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Subject assigned to teacher successfully');
    await SubjectTeacher.destroy({ where: { teacherid: newTeacher.teacherid } });
    await Subject.destroy({ where: { subjectname: testSubject.subjectname } });
    await Teacher.destroy({ where: { email: newTeacher.email } });
  });

  it('Should return 404 if the teacher is not found', async () => {
    const existentSubjectId = '1001938504758198273'; 
    const response = await request(app)
      .post('/teachers/assign-subject/112358')
      .send({
        subjectid: existentSubjectId, 
      })
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Teacher not found');
  });
  
  it('Should return 404 if the subject is not found', async () => {
  
    const nonExistentSubjectId = 112358;
    const newTeacher = await Teacher.create({ firstname: 'John', lastname: 'Doe', email: 'testNewTeacherFail@example.com', password: 'password', subjects: []});
    const response = await request(app)
      .post(`/teachers/assign-subject/${newTeacher.teacherid}`)
      .send({
        subjectid: `${nonExistentSubjectId}`, 
      })
      .set('Authorization', `Bearer ${teacherToken}`);
  
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Subject not found');
    await Teacher.destroy({ where: { teacherid: newTeacher.teacherid } });
  });

  it("Should remove a subject from a teacher", async () => {

    const newTeacherEmail = 'johnnycage8@gmail.com';
    const Subject1 = await Subject.create({
      subjectname: "newSubject"
    });
    const Subject2 = await Subject.create({
      subjectname: "anotherNewSubject"
    });
    const newTeacher = await Teacher.create({
      firstname: 'John',
      lastname: 'Cage',
      email: newTeacherEmail,
      password: oldPassword,
      subjects: [`${Subject1.subjectid}`, `${Subject2.subjectid}`],
    });
    const response = await request(app)
      .delete(`/teachers/remove-subject/${newTeacher.teacherid}`)
      .send({
        subjectid: `${Subject1.subjectid}`,
      })
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Subject removed from teacher successfully');
    await SubjectTeacher.destroy({ where: { teacherid: newTeacher.teacherid } });
    await Teacher.destroy({ where: { email: newTeacherEmail } });
    await Subject.destroy({ where: { subjectname: `${Subject1.subjectname}` } });
    await Subject.destroy({ where: { subjectname: `${Subject2.subjectname}` } });
  });

  it('Should not remove subject if teacher does not exist', async () => {
    const nonExistentTeacherId = 9999;
    const response = await request(app)
      .delete(`/teachers/remove-subject/${nonExistentTeacherId}`)
      .send({
        subjectid: subjectTest.subjectid,
      })
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Teacher not found');
  });

  it('Should not remove subject if subject does not exist', async () => {

    const firstTestSubect = await Subject.create({
      subjectname: "firstTestSubject"
    });

    const secondTestSubject = await Subject.create({
      subjectname: "secondTestSubject"
    });
     
    const yetAnotherTeacher = await Teacher.create({
      firstname: 'Jacob',
      lastname: 'Smith',
      email: 'jacobsmit123h@gmail.com',
      password: oldPassword,
      subjects: [`${firstTestSubect.subjectid}`, `${secondTestSubject.subjectid}`],
    });
    
    const nonExistentSubjectId = 9999;
    const response = await request(app) 
    .delete(`/teachers/remove-subject/${yetAnotherTeacher.teacherid}`)
    .send({
      subjectid: nonExistentSubjectId,
    })
    .set('Authorization', `Bearer ${teacherToken}`);
    
    expect(response.status).toBe(404);
    await SubjectTeacher.destroy({ where: { teacherid: yetAnotherTeacher.teacherid } });
    await Teacher.destroy({ where: { email: yetAnotherTeacher.email } });
    await Subject.destroy({ where: { subjectname: `${firstTestSubect.subjectname}` } });
    await Subject.destroy({ where: { subjectname: `${secondTestSubject.subjectname}` } });
  });

  it("Should retrieve all teachers that dictate an specific subject", async () => {

    const hashedOldPassword = await bcrypt.hash(oldPassword, 10);

    const commonTestSubject = await Subject.create({
      subjectname: "commonTestSubject21"
    });

    const firstCommonTeacher = await Teacher.create({
      firstname: 'Sean',
      lastname: 'Smith',
      email: 'seansmith32@gmail.com',
      password: hashedOldPassword,
    });

    const secondCommonTeacher = await Teacher.create({
      firstname: 'Seamus',
      lastname: 'Smith',
      email: 'seamussmith32@gmail.com',
      password: hashedOldPassword,
    });

    await request(app).post(`/teachers/assign-subject/${firstCommonTeacher.teacherid}`).send({
      subjectid: `${commonTestSubject.subjectid}`,
    }).set('Authorization', `Bearer ${teacherToken}`);
    
    await request(app).post(`/teachers/assign-subject/${secondCommonTeacher.teacherid}`).send({
      subjectid: `${commonTestSubject.subjectid}`,
    }).set('Authorization', `Bearer ${teacherToken}`);

    const firstTeacherSchedule = await Schedule.create({
      teacherid: firstCommonTeacher.teacherid,
      start_time: "08:00",
      end_time: "09:00",
      dayofweek: 1,
      maxstudents: 1
    });

    const secondTeacherSchedule = await Schedule.create({
      teacherid: firstCommonTeacher.teacherid,
      start_time: "08:00",
      end_time: "09:00",
      dayofweek: 2,
      maxstudents: 1
    });

    await MonthlySchedule.create({
      datetime: "2023-05-29 10:00:00", //quizas esta fecha cause problemas
      teacherid: firstCommonTeacher.teacherid,


    });

    await MonthlySchedule.create({
      datetime: "2023-05-29 11:00:00", //quizas esta fecha cause problemas
      teacherid: firstCommonTeacher.teacherid,


    });

    const response = await request(app).get(`/teachers/all-dictating/${commonTestSubject.subjectid}`)
    .set('Authorization', `Bearer ${teacherToken}`);


    await Schedule.destroy({ where: { weeklyscheduleid: firstTeacherSchedule.weeklyscheduleid } });
    await Schedule.destroy({ where: { weeklyscheduleid: secondTeacherSchedule.weeklyscheduleid } });
    await SubjectTeacher.destroy({ where: { teacherid: firstCommonTeacher.teacherid } });
    await SubjectTeacher.destroy({ where: { teacherid: secondCommonTeacher.teacherid } });
    await Teacher.destroy({ where: { email: firstCommonTeacher.email } });
    await Teacher.destroy({ where: { email: secondCommonTeacher.email } });
    await Subject.destroy({ where: { subjectname: `${commonTestSubject.subjectname}` } });

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
  });

  it("Should retrieve all teachers", async () => {
    await Teacher.create({ firstname: 'John', lastname: 'Doe', email: 'testNewTeacher12345@example.com', password: 'password'});
    const response = await request(app).get('/teachers/all-teachers')
    .set('Authorization', `Bearer ${teacherToken}`);
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(1);

    await Teacher.destroy({ where: { email: 'testNewTeacher12345@example.com' } });
  });

  it("Should not delete a teacher when having a reservation pending", async() => {
    
    const reservation = await Reservation.create({
      student_id: studentId,
      teacher_id: secondTeacherID,
      subject_id: subjectId,
      schedule_id: firstTeacherMonthlyScheduleId,
      datetime: "2039-05-29 10:00:00",

    });

    const response = await request(app).delete(`/teachers/delete/${secondTeacherID}`)
    .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(400)
  });


  it('Should throw an error if subjects are invalid', async () => {
    await expect(updateTeacherSubjects('teacher@example.com', null))
        .rejects.toThrow('Invalid subjects data');

    await expect(updateTeacherSubjects('teacher@example.com', []))
        .rejects.toThrow('Invalid subjects data');
  });

it('Should throw an error if the teacher is not found', async () => {
    // Spy on Teacher.findOne and return null (simulate teacher not found)
    jest.spyOn(Teacher, 'findOne').mockResolvedValue(null);

    await expect(updateTeacherSubjects('teacher@example.com', ['1', '2']))
        .rejects.toThrow('Teacher not found');

    // Check that Teacher.findOne was called with the correct email
    expect(Teacher.findOne).toHaveBeenCalledWith({ where: { email: 'teacher@example.com' } });
});

it('Should call destroy and bulkCreate when valid teacher and subjects are provided', async () => {
    // Spy on Teacher.findOne and return a fake teacher
    jest.spyOn(Teacher, 'findOne').mockResolvedValue({ teacherid: 1 });

    // Spy on SubjectTeacher.destroy to simulate successful deletion
    const destroySpy = jest.spyOn(SubjectTeacher, 'destroy').mockResolvedValue(true);

    // Spy on SubjectTeacher.bulkCreate to simulate successful bulk insert
    const bulkCreateSpy = jest.spyOn(SubjectTeacher, 'bulkCreate').mockResolvedValue(true);

    // Call the helper function
    await expect(updateTeacherSubjects('teacher@example.com', ['1', '2']))
        .resolves.not.toThrow();

    // Ensure the destroy method was called with the correct teacher ID
    expect(destroySpy).toHaveBeenCalledWith({ where: { teacherid: 1 } });

    // Ensure bulkCreate was called with the correct new relations
    expect(bulkCreateSpy).toHaveBeenCalledWith([
        { teacherid: 1, subjectid: '1' },
        { teacherid: 1, subjectid: '2' }
    ]);
});

it('should throw an error if the teacher is not found', async () => {
  // Spy on Teacher.findOne and return null (simulate teacher not found)
  jest.spyOn(Teacher, 'findOne').mockResolvedValue(null);

  await expect(updateTeacherSubjects('teacher@example.com', ['1', '2']))
      .rejects.toThrow('Teacher not found');

  // Check that Teacher.findOne was called with the correct email
  expect(Teacher.findOne).toHaveBeenCalledWith({ where: { email: 'teacher@example.com' } });
  });

});