const { Op } = require('sequelize');
const MonthlySchedule = require('../models/monthlyScheduleModel');
const moment = require('moment');

const createMonthlySchedule = async (datetime, teacherid, maxstudents, currentstudents) => {
  try {
    for (let i = 0; i < 4; i++) {
      const scheduleDate = moment(datetime).add(i * 7, 'days').format('YYYY-MM-DD HH:mm:ss');

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

    const startDate = moment(startdate).startOf('day').toDate();
    const endDate = moment(enddate).endOf('day').toDate();


    const schedules = await MonthlySchedule.findAll({
      where: {
        teacherid: teacherid, 
        datetime: {
          [Op.between]: [startDate, endDate]
        },
        istaken: false 
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

const getMonthlyScheduleByTeacherId  = async (req, res) => {
  try {
    const { teacherid } = req.params;
    const monthlySchedule = await MonthlySchedule.findAll({
      where: {
        teacherid: teacherid,
        istaken: false,
      },
    });
    if (monthlySchedule.length > 0) {
      res.status(200).json(monthlySchedule);
    } else {
      res.status(404).send('Monthly schedule not found');
    }
    }catch (error) {
      /*istanbul ignore next*/
      res.status(500).send('Server error');
    }
  }

module.exports = {
  getIndividualClasses,
  getGroupClasses,
  createMonthlySchedule,
  assignVacation,
  getMonthlyScheduleByTeacherId
};
