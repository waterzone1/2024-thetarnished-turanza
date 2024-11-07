const request = require('supertest');
const app = require('../app');
const Subject = require('../models/subjectModel');
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');
const bcrypt = require('bcrypt');
const SubjectTeacher = require('../models/subjectTeacherModel');
const Schedule = require('../models/weeklyScheduleModel');
const jwt = require('jsonwebtoken');


describe('Authentication API', () => {
    
    let student;
    let teacher;
    let studentToken;
    let teacherToken;
    let hashedOldPassword;
    const teacherFirstName = 'John';
    const teacherLastName = 'Doe';
    const teacherEmail = 'testTeacher@example.com';
    const studentFirstName = 'Jane';
    const studentLastName = 'Doe';
    const studentEmail = 'testStudent@example.com';
    const oldPassword = 'oldpassword';
    const newPassword = 'newpassword';
    let teacherToDelete;
    let studentToDelete;

    jest.setTimeout(20000);
    beforeAll(async () => {
        hashedOldPassword = await bcrypt.hash(oldPassword, 10);
        subjectTest = await Subject.create({
            subjectname: 'authSubjectTest'
        });
        subjectTestID = subjectTest.subjectid;
        student = await Student.create({ firstname: studentFirstName, lastname: studentLastName, email: studentEmail, password: hashedOldPassword});
        teacher = await Teacher.create({ firstname: teacherFirstName, lastname: teacherLastName, email: teacherEmail, password: hashedOldPassword, subjects: [], is_active: true}); 
        teacherToDelete = await Teacher.create({ firstname: teacherFirstName, lastname: teacherLastName, email: "testTeacher35@example.com", password: hashedOldPassword, subjects: []});
        studentToDelete = await Student.create({ firstname: studentFirstName, lastname: studentLastName, email: "testStudent192@example.com", password: hashedOldPassword});
        studentToken = await jwt.sign({ studentid: student.studentid, role: 'STUDENT' }, process.env.JWT_AUTH_SECRET);
        teacherToken = await jwt.sign({ teacherid: teacher.teacherid, role: 'TEACHER' }, process.env.JWT_AUTH_SECRET);
    });
    
    afterAll(async () => {
        await Student.destroy({ where: { email: studentEmail } });
        await Student.destroy({ where: { email: "testStudent192@example.com" } });
        await Teacher.destroy({ where: { email: teacherEmail } });
        await Teacher.destroy({ where: { email: "testTeacher35@example.com" } });
    });

    it("Should register a teacher", async () => {

        const registerResponse = await request(app)
            .post('/authentication/register')
            .send({
                firstname: 'Balti',
                lastname: 'Turanza',
                email: 'linkandlearn@gmail.com',
                password: oldPassword,
                subjects: [],
                role:"TEACHER",
            });
        expect(registerResponse.status).toBe(201);
        const email = 'linkandlearn@gmail.com';
        await Teacher.destroy({ where: { email: email } });
    });

    it("Should register a teacher dictating two subjects", async () => {
        const subject1 = await Subject.create({
            subjectname: 'subject1'
        });

        const subject2 = await Subject.create({
            subjectname: 'subject2'
        });

        const registerResponse = await request(app)
            .post('/authentication/register')
            .send({
                firstname: 'Balti',
                lastname: 'Turanza',
                email: 'linkandlearn@gmail.com',
                password: oldPassword,
                subjects: [(subject1.subjectid).toString(), (subject2.subjectid).toString()],
                role:"TEACHER",
            });
        expect(registerResponse.status).toBe(201);
        const email = 'linkandlearn@gmail.com';
        await Teacher.destroy({ where: { email: email } });
    });

    it("Should register a student", async () => {
        const registerResponse = await request(app)
            .post('/authentication/register')
            .send({
                firstname: 'Balti',
                lastname: 'Turanza',
                email: 'anotheremail@gmail.com',
                password: oldPassword,
                role:"STUDENT",
            });

        expect(registerResponse.status).toBe(201);
        await Student.destroy({ where: { email: 'anotheremail@gmail.com' } });
    });

    it("Should not register a user if it already exists", async () => {

            const registerResponse = await request(app)
            .post('/authentication/register')
            .send({
                firstname: studentFirstName,
                lastname: studentLastName,
                email: studentEmail,
                password: oldPassword,
                role:"STUDENT",
            });
            
        expect(registerResponse.status).toBe(401);
        expect(registerResponse.body.message).toBe('User already exists');
    }),

    it('Should not register a student with wrong email', async () => {
        const registerResponse = await request(app)
            .post('/authentication/register')
            .send({
                firstname: studentFirstName,
                lastname: studentLastName,
                email: 'wrongemail',
                password: oldPassword,
                role:"STUDENT",
            });
        expect(registerResponse.status).toBe(400);
        expect(registerResponse.body.message).toBe('Invalid email');
    });

    it("Should login a Teacher", async () => {
        const loginResponse = await request(app)
            .post('/authentication/login')
            .send({
                email: teacherEmail,
                password: oldPassword,
        });

        const data = jwt.decode(loginResponse.body.token, process.env.JWT_AUTH_SECRET);

        expect(loginResponse.status).toBe(200);
        expect(data.role).toBe('TEACHER');
    });

    it('should login a teacher who is already dictating subjects', async () => {

        const subject1 = await Subject.create({
            subjectname: 'subject1'
        });

        const subject2 = await Subject.create({
            subjectname: 'subject2'
        });

        await SubjectTeacher.create({
            subjectid: subject1.subjectid,
            teacherid: teacher.teacherid
        });

        await SubjectTeacher.create({
            subjectid: subject2.subjectid,
            teacherid: teacher.teacherid
        });

        const loginResponse = await request(app)
            .post('/authentication/login')
            .send({
                email: teacherEmail,
                password: oldPassword,
        });

        const data = jwt.decode(loginResponse.body.token, process.env.JWT_AUTH_SECRET);
        expect(loginResponse.status).toBe(200);
        expect(data.role).toBe('TEACHER');
        expect(loginResponse.body.user_subjects.length).toBe(2);

        await Subject.destroy({ where: { subjectid: subject1.subjectid } });
        await Subject.destroy({ where: { subjectid: subject2.subjectid } });
    });

    it('should login a teacher who already has a existing schedule', async () => {
        const schedule = await Schedule.create({ start_time: '19:00:00', end_time: '10:00:00', teacherid: teacher.teacherid, dayofweek: 1, maxstudents: 1});

        const loginResponse = await request(app)
            .post('/authentication/login')
            .send({
                email: teacherEmail,
                password: oldPassword,
        });

        const data = jwt.decode(loginResponse.body.token, process.env.JWT_AUTH_SECRET);

        expect(loginResponse.status).toBe(200);
        expect(data.role).toBe('TEACHER');
        await Schedule.destroy({ where: { weeklyscheduleid: schedule.weeklyscheduleid } });
    });

    it("Should not login a student with wrong email", async () => {
        const loginResponse = await request(app)
            .post('/authentication/login')
            .send({
                email: "wrongemail@gmail.com",
                password: oldPassword,
            });
        expect(loginResponse.status).toBe(404);
        expect(loginResponse.body.message).toBe('User not found')    
    });

    it("Should not login a student with wrong password", async () => {     
        const loginResponse = await request(app)
            .post('/authentication/login')
            .send({
                email: studentEmail,
                password: "wrongpassword",
        });

        expect(loginResponse.status).toBe(401);
        expect(loginResponse.body.message).toBe('Invalid password') 
    });

    it('Should not change the password if the user is not found', async () => {
        const response = await request(app)
          .put('/authentication/change-password')
          .send({ oldPassword: oldPassword, newPassword: newPassword, email: "anothernonexistentuser@gmail.com" })
          .set('Authorization', `Bearer ${studentToken}`);
    
        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    it('Should return 401 if the old password is incorrect', async () => {
        const response = await request(app)
          .put('/authentication/change-password')
          .send({ oldPassword: "wrongpassword", newPassword: newPassword, email: studentEmail })
          .set('Authorization', `Bearer ${studentToken}`);
    
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid password');
    });

    it('Should successfully change password for a student', async () => {
        const response = await request(app)
          .put('/authentication/change-password')
          .send({ oldPassword: oldPassword, newPassword: newPassword, email: studentEmail })
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Password changed successfully');
    });

    it('Should successfully change password for a teacher', async () => {
        const response = await request(app)
          .put('/authentication/change-password')
          .send({ oldPassword: oldPassword, newPassword: newPassword, email: teacherEmail })
          .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Password changed successfully');
    });

    it('Should allow a student to edit their profile', async () => {
        const response = await request(app)
          .put('/authentication/edit-profile')
          .send({
            firstname: 'Jackson',
            lastname: 'Doe',
            email: studentEmail,
          })
          .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Profile updated successfully');
    });

    it('Should allow a teacher to edit their profile', async () => {
        const response = await request(app)
          .put('/authentication/edit-profile')
          .send({
            firstname: 'Jackson',
            lastname: 'Doe',
            email: teacherEmail,
            subjects: [`${subjectTestID}`]
          })
          .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Profile updated successfully');
    });

    it('Should not allow a student to edit their profile with invalid email', async () => {
        const response = await request(app)
          .put('/authentication/edit-profile')
          .send({
            firstname: 'Jackson',
            lastname: 'Doe',
            email: 'invalidemail@hotmail.com',
          })
          .set('Authorization', `Bearer ${studentToken}`);
          expect(response.status).toBe(404);
          expect(response.body.message).toBe('User not found');
    }); 

    it('Should not allow a student to edit their profile with invalid email', async () => {
            const response = await request(app)
              .put('/authentication/edit-profile')
              .send({
                firstname: 'Jackson',
                lastname: 'Doe',
                email: 'invalidemail@hotmail.com',
              })
              .set('Authorization', `Bearer ${studentToken}`);

              expect(response.status).toBe(404);
              expect(response.body.message).toBe('User not found');
    });

    it('Should allow a student to delete their account', async () => {
        const response = await request(app)
          .delete('/authentication/delete-account')
          .send({
            email: studentEmail,
        })
        .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User account deleted successfully');
    });

    it('Should not allow a student to delete their account with invalid email', async () => {
        const response = await request(app)
          .delete('/authentication/delete-account')
          .send({
            email: 'invalidemail@hotmail.com',
        })
        .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    it('Should allow a teacher to delete their account', async () => {
        const response = await request(app)
          .delete('/authentication/delete-account')
          .send({
            email: teacherEmail,
        })
        .set('Authorization', `Bearer ${teacherToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User account deleted successfully');
    });


    it('Should not allow an user to confirm delete their account with invalid email', async () => {
        const response = await request(app)
          .post(`/authentication/delete-account/xd@asd.com`)
          .send({
            password: 'xd',
        })
        .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    it('Should not allow a teacher to confirm delete their account with invalid password', async () => {
        const response = await request(app)
          .post(`/authentication/delete-account/${teacherToDelete.email}`)
          .send({
            password: 'invalidpassword',
        })
        .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid password');
    });

    it('Should not allow a student to confirm delete their account with invalid password', async () => {
        const response = await request(app)
        .post(`/authentication/delete-account/${studentToDelete.email}`)
          .send({
            password: 'invalidpassword',
        })
        .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid password');
    });

    it('Should allow a teacher to confirm delete their account', async () => {
        const response = await request(app)
          .post(`/authentication/delete-account/${teacherToDelete.email}`)
          .send({
            password: oldPassword,
        })
        .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Password is correct");
    });

    it('Should allow a student to confirm delete their account', async () => {
        const response = await request(app)
          .post(`/authentication/delete-account/${studentToDelete.email}`)
          .send({
            password: oldPassword,
        })
        .set('Authorization', `Bearer ${studentToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Password is correct");
    });
});