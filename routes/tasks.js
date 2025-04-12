const express = require('express');
const { check, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const Task = require('../models/Task');

const router = express.Router();


// Get all tasks with pagination, search, and filters
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, sortBy, sortOrder } = req.query;
    
    const query = { user: req.user.id };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (status) {
      query.status = status;
    }
    
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1;
    }
    
    const tasks = await Task.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const count = await Task.countDocuments(query);
    
    res.json({
      tasks,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST tasks
// @desc    Add new task
router.post(
  '/',
  [
    authMiddleware,
    check('name', 'Name is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, status, dueDate } = req.body;

    try {
      const newTask = new Task({
        name,
        description,
        status,
        dueDate,
        user: req.user.id
      });

      const task = await newTask.save();
      res.json({"message": "task added successfully", task});
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT tasks/:id
// @desc    Update task
router.put('/:id', authMiddleware, async (req, res) => {
  console.log('Updating Task with ID:', req.params.id);
  const { name, description, status, dueDate } = req.body;

  const taskFields = {};
  if (name) taskFields.name = name;
  if (description) taskFields.description = description;
  if (status) taskFields.status = status;
  if (dueDate) taskFields.dueDate = dueDate;

  try {
    let task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ msg: 'Task not found' });

    // Make sure user owns the task
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: taskFields },
      { new: true }
    );

    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE tasks/:id
// @desc    Delete task
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ msg: 'Task not found' });

    // Make sure user owns the task
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Task removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;