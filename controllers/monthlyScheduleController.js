const { Op } = require('sequelize');
const MonthlySchedule = require('../models/monthlyScheduleModel');
const Teacher = require('../models/teacherModel');
const moment = require('moment');
const Reservation = require('../models/reservationModel');

const createMonthlySchedule = async (datetime, teacherid, maxstudents, currentstudents) => {
  try {
    for (let i = 0; i < 4; i++) {
      const scheduleDate = moment(datetime)  
      .add(i * 7, 'days')  
      .subtract(3, 'hours')  
      .format('YYYY-MM-DD HH:mm:ss');  

      await MonthlySchedule.create({
        datetime: scheduleDate,
        teacherid: teacherid,
        maxstudents: maxstudents,
        currentstudents: currentstudents,
      });
    }
  } catch (error) {
    /* istanbul ignore next */
    throw error;
  }
};

const getIndividualClasses = async (req, res) => {
  try {
      const allClasses = await MonthlySchedule.findAll({
          where: {
              maxstudents: 1,
              istaken: false,
          },
      });

      const filteredClasses = allClasses.filter(
          (classItem) => classItem.currentstudents < classItem.maxstudents
      );

      if (filteredClasses.length === 0) {
          return res.status(404).json({ message: 'No individual classes found' });
      }

      res.status(200).json(filteredClasses);
  } catch (err) {
      
      res.status(500).send('Server error');
  }
};

const getGroupClasses = async (req, res) => {
  try {
      const allClasses = await MonthlySchedule.findAll({
          where: {
              istaken: false,
          },
      });

      const filteredClasses = allClasses.filter(
          (classItem) => classItem.currentstudents < classItem.maxstudents
      );

      const refilteredClasses = filteredClasses.filter(
        (classItem) => classItem.maxstudents > 1
      );

      if (refilteredClasses.length === 0) {
          return res.status(404).json({ message: 'No group classes found' });
      }

      res.status(200).json(refilteredClasses);
      
  } catch (err) {
      
      res.status(500).send('Server error');
  }

};

const assignVacation = async (req, res) => {
  try {
    const { teacherid, startdate, enddate } = req.body;
    await Teacher.update({ on_vacation: true }, { where: { teacherid: teacherid } })
    const startDate = moment(startdate).startOf('day').toDate();
    const endDate = moment(enddate).endOf('day').toDate();

    const takenschedules = await MonthlySchedule.findAll({
      where: {
        teacherid: teacherid, 
        datetime: {
          [Op.between]: [startDate, endDate]
        }, 
        currentstudents: {
          [Op.gt]: 0
        }
      }
    });
    if(takenschedules.length > 0){
      return res.status(403).json({ message: 'cannot set vacations while having booked classes on that time gap' });
    }
    const schedules = await MonthlySchedule.findAll({
      where: {
        teacherid: teacherid, 
        datetime: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    if (schedules.length > 0) {
      await MonthlySchedule.update(
        { istaken: true },
        {
          where: {
            monthlyscheduleid: {
              [Op.in]: schedules.map(schedule => schedule.monthlyscheduleid)
            }
          }
        }
      );
      const updatedSchedules = schedules.map(schedule => ({
        ...schedule.toJSON(),
        istaken: true
      }));
      res.status(200).json(updatedSchedules);
    } else {
      res.status(404).send('Schedules not found');
    }
  } catch (error) {
    /*istanbul ignore next*/
    res.status(500).send('Server error');
  }
};
const stopVacation = async (req, res) => {
  try {
    const { teacherid } = req.body;
    await Teacher.update({ on_vacation: false }, { where: { teacherid: teacherid } });

    const schedules = await MonthlySchedule.findAll({
      where: {
        teacherid: teacherid,
        istaken: true,
        currentstudents: 0,
      },
    });

    for (const schedule of schedules) {
        await MonthlySchedule.update({ istaken: false }, { where: { monthlyscheduleid: schedule.monthlyscheduleid } })
    }

    return res.status(200).send('Vacation stopped and schedules updated');
  } catch (error) {
    /*istanbul ignore next*/
    return res.status(500).send('Server error');
  }
};

const getMonthlyScheduleByTeacherId = async (req, res) => {
  try {
    const { teacherid } = req.params;
    const monthlySchedule = await MonthlySchedule.findAll({
      where: {
        teacherid: teacherid,
        istaken: false,
      },
      order: [['datetime', 'ASC']],
    });

    if (monthlySchedule.length > 0) {
      const formattedSchedule = monthlySchedule.map((schedule) => {
        const startTime = new Date(schedule.datetime).toTimeString().split(' ')[0]; 
        const endTime = new Date(new Date(schedule.datetime).getTime() + 60 * 60 * 1000).toTimeString().split(' ')[0]; 
        const dayOfMonth = new Date(schedule.datetime).getDate(); 
        let jsDayOfWeek = new Date(schedule.datetime).getDay(); 
        const dayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek;
        return {
          scheduleid: schedule.monthlyscheduleid.toString(),
          start_time: startTime,
          end_time: endTime,
          teacherid: schedule.teacherid.toString(),
          dayofmonth: dayOfMonth,
          dayofweek: dayOfWeek,
          maxstudents: schedule.maxstudents,
        };
      });

      res.status(200).json(formattedSchedule);
    } else {
      res.status(404).send('Monthly schedule not found');
    }
  } catch (error) {
    /*istanbul ignore next*/
    res.status(500).send('Server error');
  }
};

const getMonthlySubjectScheduleByTeacherId = async (req, res) => {
  try {
    const { teacherid } = req.params;
    const { subjectid } = req.body;

    const monthlySchedules = await MonthlySchedule.findAll({
      where: {
        teacherid: teacherid,
        istaken: false,
      },
      order: [['datetime', 'ASC']],
    });
  
    let filteredSchedules = [];
  

    for (const schedule of monthlySchedules) {
      const reservations = await Reservation.findAll({
        where: {
          schedule_id: schedule.monthlyscheduleid,
        }
      });
      if (reservations.length === 0) {
        filteredSchedules.push(schedule);
        continue; 
      }
      let allMatch = true;
  
      for (const reservation of reservations) {
        if (reservation.subject_id !== subjectid) {
          allMatch = false;
          break; 
        }
      }
  

      if (allMatch) {
        filteredSchedules.push(schedule);
      }
    }

    if (filteredSchedules.length > 0) {
      const formattedSchedule = filteredSchedules.map((schedule) => {
        const startTime = new Date(schedule.datetime).toTimeString().split(' ')[0]; 
        const endTime = new Date(new Date(schedule.datetime).getTime() + 60 * 60 * 1000).toTimeString().split(' ')[0]; 
        const dayOfMonth = new Date(schedule.datetime).getDate(); 
        let jsDayOfWeek = new Date(schedule.datetime).getDay(); 
        const dayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek;
        return {
          scheduleid: schedule.monthlyscheduleid.toString(),
          start_time: startTime,
          end_time: endTime,
          teacherid: schedule.teacherid.toString(),
          dayofmonth: dayOfMonth,
          dayofweek: dayOfWeek,
          maxstudents: schedule.maxstudents,
        };
      });

      res.status(200).json(formattedSchedule);
    } else {
      res.status(404).send('Monthly schedule not found');
    }
  } catch (error) {
    /*istanbul ignore next*/
    res.status(500).send('Server error');
  }
};

module.exports = {
  getIndividualClasses,
  getGroupClasses,
  createMonthlySchedule,
  assignVacation,
  getMonthlyScheduleByTeacherId,
  stopVacation,
  getMonthlySubjectScheduleByTeacherId
};
