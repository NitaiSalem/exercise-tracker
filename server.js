const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }, () => console.log('Connected to DB'));
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const { Schema } = mongoose;

const exerciseSessionSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String }
})

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  log: [exerciseSessionSchema],
  count: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', exerciseSessionSchema);

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

app.post('/api/users', (req, res) => {

  let newUser = new User({ username: req.body.username });
  newUser.save((err, savedUser) => {
    if (!err) {
      let userObj = {};
      userObj['username'] = savedUser.username;
      userObj['_id'] = savedUser._id;
      res.json(userObj);
    };

  })

});

app.get('/api/users', (req, res) => {

  User.find({}).exec((err, data) => {

    let sortedArray = data.map(userObject => ({ username: userObject.username, _id: userObject._id })); //passes test either way 
    res.json(sortedArray)
  });
})

app.post('/api/users/:_id/exercises', (req, res) => {
  console.log('this is my req.body', req.body);

  let newSession = new Session({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date,
  });

  if (newSession.date === '') {
    newSession.date = new Date().toISOString().substring(0, 10);
  }

  User.findByIdAndUpdate(req.params._id, {
    $push: { log: newSession }, $inc: { count: 1 }
  },
    { new: true, useFindAndModify: false },
    (err, updatedUser) => {
      if (!err) {
        let responseObj = {};
        responseObj['_id'] = updatedUser._id;
        responseObj['username'] = updatedUser.username;
        responseObj['date'] = new Date(newSession.date).toDateString();
        responseObj['duration'] = newSession.duration;
        responseObj['description'] = newSession.description;

        res.json(responseObj);
      }
    })
})

app.get('/api/users/:_id/logs', (req, res) => {

  User.findById(req.params._id, (err, user) => {

    if (req.query.from || req.query.to) {

      let fromDate = new Date(0);
      let toDate = new Date();

      if (req.query.from) {
        fromDate = new Date(req.query.from);
      }

      if (req.query.to) {
        toDate = new Date(req.query.to);
      }

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      user.log = user.log.filter((session) => {
        let sessionDate = new Date(session.date).getTime();

        return sessionDate >= fromDate && sessionDate <= toDate;

      })
    }

    if (req.query.limit) {
      user.log = user.log.slice(0, req.query.limit);
    }

    res.json(user);
  });
})
