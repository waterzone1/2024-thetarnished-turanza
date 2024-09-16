const request = require('supertest');
const app = require('../app');
const Teacher = require('../models/teacherModel');
const Subject = require('../models/subjectModel');
const Schedule = require('../models/scheduleModel');
const Student = require('../models/studentModel');
const Reservation = require('../models/reservationModel');

describe('Reservation Controller Tests', () => {
  let teacherId;
  let studentId;
  let scheduleId;
  let subjectId;
  let reservationId;
  let newStudentId;
  let newTeacherId;

  beforeAll(async () => {
    const teacher = await Teacher.create(
      { firstname: 'John', lastname: 'Doe', email: 'john.doe5@example.com', password: 'password' });
    teacherId = teacher.teacherid;

    const newTeacher = await Teacher.create(
      { firstname: 'John', lastname: 'Doe', email: 'john.doe6@example.com', password: 'password' });
    newTeacherId = newTeacher.teacherid;

    const student = await Student.create(
      { firstname: 'Jane', lastname: 'Doe', email: 'jane.doe7@example.com', password: 'password' });
    studentId = student.studentid;

    const newStudent = await Student.create(
      { firstname: 'Jane', lastname: 'Doe', email: 'jane.doe8@example.com', password: 'password' });
    newStudentId = newStudent.studentid;

    const schedule = await Schedule.create(
      { start_time: '09:00:00', end_time: '10:00:00', teacherid: teacherId, dayofweek: 1 });
    scheduleId = schedule.scheduleid;
    
    const subject = await Subject.create(
      { subjectname: 'Mathematics' });
    subjectId = subject.subjectid;
  });

  afterAll(async () => {
    await Schedule.destroy({ where: { scheduleid: scheduleId } });
    await Teacher.destroy({ where: { teacherid: teacherId } });
    await Teacher.destroy({ where: { teacherid: newTeacherId } });
    await Student.destroy({ where: { studentid: studentId } });
    await Student.destroy({ where: { studentid: newStudentId } });
    await Subject.destroy({ where: { subjectid: subjectId } });
  });

  it('should create a new reservation', async () => {
    const res = await request(app)
      .post('/reservation/create')
      .send({
        student_id: studentId,
        subject_id: subjectId,
        teacher_id: teacherId,
        dayofweek: 1,
        start_time: '09:00:00',
        schedule_id: scheduleId,
      });

    expect(res.status).toBe(201);
    reservationId = res.body.id;
  });

  it('should not create a reservation if one already exists', async () => {
    const res = await request(app)
      .post('/reservation/create')
      .send({
        student_id: studentId,
        subject_id: subjectId,
        teacher_id: teacherId,
        dayofweek: 1,
        start_time: '09:00:00',
        schedule_id: scheduleId,
      });
  
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('A reservation already exists for this teacher at the same time and date.');
  });

  it('should return 500 if an error occurs during reservation creation', async () => {
    jest.spyOn(Reservation, 'create').mockImplementation(() => {
      throw new Error('Database error');
    });

    const res = await request(app)
      .post('/reservation/create')
      .send({
        student_id: newStudentId,
        subject_id: subjectId,
        teacher_id: newTeacherId,
        dayofweek: 1,
        start_time: '09:00:00',
        schedule_id: scheduleId,
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Error creating reservation');

    Reservation.create.mockRestore();
  });

  it('should get all reservations for a student', async () => {
    const res = await request(app)
      .get(`/reservation/student/${studentId}`)
      
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should return 404 if no reservations found for student', async () => {
    const res = await request(app)
      .get(`/reservation/student/${newStudentId}`)
      
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('No reservations found for this student.');
  });

  it('should return 404 if the student doess not exist', async () => {
    const res = await request(app)
      .get(`/reservation/student/123`)
    
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Student not found');
  });

  it('should return 500 if an error occurs during student reservation retrieval', async () => {
    jest.spyOn(Reservation, 'findAll').mockImplementation(() => {
      throw new Error('Database error');
    });
    
    const res = await request(app)
      .get(`/reservation/student/${studentId}`)

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Error fetching reservations for student');
    
    Reservation.findAll.mockRestore();
  });

  it('should return 404 if the reservation does not exist', async () => {
    const res = await request(app)
      .delete(`/reservation/delete/123`)

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Reservation not found');
  });

  it('should get all reservations for a teacher in the next 5 days', async () => {
    const res = await request(app)
      .get(`/reservation/teacher/${teacherId}`)

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should return 404 if no reservations found for teacher', async () => {
    const res = await request(app)
      .get(`/reservation/teacher/${newTeacherId}`)
      
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('No reservations found for this teacher in the next five days.');
  });

  it('should return 404 if the teacher does not exist', async () => {
    const res = await request(app)
      .get(`/reservation/teacher/123`)
    
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Teacher not found');
  });

  it('should return 500 if an error occurs during teacher reservation retrieval', async () => {
    jest.spyOn(Reservation, 'findAll').mockImplementation(() => {
      throw new Error('Database error');
    });
    
    const res = await request(app)
      .get(`/reservation/teacher/${teacherId}`)

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Error fetching reservations for teacher');
    
    Reservation.findAll.mockRestore();
  });

  it('should delete an existing reservation', async () => {
    const res = await request(app)
      .delete(`/reservation/delete/${reservationId}`)

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Reservation deleted successfully');
  });

  it('should return 500 if an error occurs during reservation delete', async () => {
    jest.spyOn(Reservation, 'findByPk').mockImplementation(() => {
      throw new Error('Database error');
    });

    const res = await request(app)
      .delete(`/reservation/delete/${reservationId}`)

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Error deleting reservation');

    Reservation.findByPk.mockRestore();
  });
  
});
