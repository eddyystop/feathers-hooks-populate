
const feathers = require('feathers');
const memory = require('feathers-memory');
const feathersHooks = require('feathers-hooks');
const getInitDb = require('./getInitDb');

module.exports = function (dbNames) {
  dbNames = typeof dbNames === 'string' ? [dbNames] : dbNames;
  const serviceConfigs = {
    users,
    comments,
    posts,
    recommendation
  };

  return feathers()
    .configure(feathersHooks())
    .configure(services);

  function services () {
    dbNames.forEach(name => {
      // console.log(`configure service ${name}`);
      this.configure(serviceConfigs[name]);
    });
  }

  function users () {
    this.use('users', memory(getInitDb('users')));
  }

  function comments () {
    this.use('comments', memory(getInitDb('comments')));
  }

  function posts () {
    this.use('posts', memory(getInitDb('posts')));
  }

  function recommendation () {
    this.use('recommendation', memory(getInitDb('recommendation')));
  }
};
