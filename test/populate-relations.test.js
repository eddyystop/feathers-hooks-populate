
const assert = require('assert');
const configApp = require('../test/helpers/configApp');
const getInitDb = require('../test/helpers/getInitDb');
const { populate } = require('../src');

describe('populate - 1:1 & 1:m & m:1', () => {
  let hookAfter;
  let hookAfterArray;
  let schema;
  
  let app;
  let recommendation;
  let posts;
  let users;
  let comments;
  
  beforeEach(() => {
    app = configApp(['recommendation', 'posts','users', 'comments']);
    recommendation = clone(getInitDb('recommendation').store);
    posts = clone(getInitDb('posts').store);
    users = clone(getInitDb('users').store);
    comments = clone(getInitDb('comments').store);
    
    hookAfter = {
      type: 'after',
      method: 'create',
      params: { provider: 'rest' },
      path: 'recommendations',
      result: recommendation['1'],
    };
    hookAfterArray = {
      type: 'after',
      method: 'create',
      params: { provider: 'rest' },
      path: 'recommendations',
      result: [recommendation['1'], recommendation['2'], recommendation['3'],],
    };
    
    schema = {
      permissions: '',
      include: [
        {
          service: 'posts',
          nameAs: 'post',
          parentField: 'postId',
          childField: 'id',
          include: [
            { // 1:1
              service: 'users',
              permissions: '',
              nameAs: 'authorInfo',
              parentField: 'author',
              childField: 'id',
            },
            { // 1:m
              service: 'comments',
              permissions: '',
              nameAs: 'commentsInfo',
              parentField: 'id',
              childField: 'postId',
              select: (hook, parent) => ({ $limit: 6 }),
              asArray: true,
              query: {
                $limit: 5,
                $select: ['title', 'content', 'postId'],
                $sort: {createdAt: -1}
              },
            },
            { // m:1
              service: 'users',
              permissions: '',
              nameAs: 'readersInfo',
              parentField: 'readers',
              childField: 'id'
            }
          ],
        },
      ],
    };
  });
  
  it('for one item', () => {
    const hook = clone(hookAfter);
    hook.app = app; // app is a func and wouldn't be cloned
    
    return populate({ schema, checkPermissions: () => true, profile: 'test' })(hook)
      .then(hook1 => {
        assert.deepEqual(hook1.result,
          { userId: 'as61389dadhga62343hads6712',
            postId: 1,
            updatedAt: 1480793101475,
            _include: [ 'post' ],
            _elapsed: { post: 1, total: 1 },
            post:
            { id: 1,
              title: 'Post 1',
              content: 'Lorem ipsum dolor sit amet 4',
              author: 'as61389dadhga62343hads6712',
              readers: [ 'as61389dadhga62343hads6712', '167asdf3689348sdad7312131s' ],
              createdAt: 1480793101559,
              _include: [ 'authorInfo', 'commentsInfo', 'readersInfo' ],
              _elapsed: { authorInfo: 2, commentsInfo: 2, readersInfo: 2, total: 2 },
              authorInfo:
              { id: 'as61389dadhga62343hads6712',
                name: 'Author 1',
                email: 'author1@posties.com',
                password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                age: 55 },
              commentsInfo:
                [ { title: 'Comment 1',
                  content: 'Lorem ipsum dolor sit amet 1',
                  postId: 1 },
                  { title: 'Comment 3',
                    content: 'Lorem ipsum dolor sit amet 3',
                    postId: 1 } ],
              readersInfo:
                [ { id: 'as61389dadhga62343hads6712',
                  name: 'Author 1',
                  email: 'author1@posties.com',
                  password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                  age: 55 },
                  { id: '167asdf3689348sdad7312131s',
                    name: 'Author 2',
                    email: 'author2@posties.com',
                    password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                    age: 16 } ] } }
        );
      });
  });
  
  it('for an item array', () => {
    const hook = clone(hookAfterArray);
    hook.app = app; // app is a func and wouldn't be cloned
    
    return populate({ schema, checkPermissions: () => true, profile: 'test' })(hook)
      .then(hook1 => {
        assert.deepEqual(hook1.result,
          [ { userId: 'as61389dadhga62343hads6712',
            postId: 1,
            updatedAt: 1480793101475,
            _include: [ 'post' ],
            _elapsed: { post: 1, total: 1 },
            post:
            { id: 1,
              title: 'Post 1',
              content: 'Lorem ipsum dolor sit amet 4',
              author: 'as61389dadhga62343hads6712',
              readers: [ 'as61389dadhga62343hads6712', '167asdf3689348sdad7312131s' ],
              createdAt: 1480793101559,
              _include: [ 'authorInfo', 'commentsInfo', 'readersInfo' ],
              _elapsed: { authorInfo: 2, commentsInfo: 2, readersInfo: 2, total: 2 },
              authorInfo:
              { id: 'as61389dadhga62343hads6712',
                name: 'Author 1',
                email: 'author1@posties.com',
                password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                age: 55 },
              commentsInfo:
                [ { title: 'Comment 1',
                  content: 'Lorem ipsum dolor sit amet 1',
                  postId: 1 },
                  { title: 'Comment 3',
                    content: 'Lorem ipsum dolor sit amet 3',
                    postId: 1 } ],
              readersInfo:
                [ { id: 'as61389dadhga62343hads6712',
                  name: 'Author 1',
                  email: 'author1@posties.com',
                  password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                  age: 55 },
                  { id: '167asdf3689348sdad7312131s',
                    name: 'Author 2',
                    email: 'author2@posties.com',
                    password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                    age: 16 } ] } },
            { userId: 'as61389dadhga62343hads6712',
              postId: 2,
              updatedAt: 1480793101475,
              _include: [ 'post' ],
              _elapsed: { post: 1, total: 1 },
              post:
              { id: 2,
                title: 'Post 2',
                content: 'Lorem ipsum dolor sit amet 5',
                author: '167asdf3689348sdad7312131s',
                readers: [ 'as61389dadhga62343hads6712', '167asdf3689348sdad7312131s' ],
                createdAt: 1480793101559,
                _include: [ 'authorInfo', 'commentsInfo', 'readersInfo' ],
                _elapsed: { authorInfo: 2, commentsInfo: 2, readersInfo: 2, total: 2 },
                authorInfo:
                { id: '167asdf3689348sdad7312131s',
                  name: 'Author 2',
                  email: 'author2@posties.com',
                  password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                  age: 16 },
                commentsInfo:
                  [ { title: 'Comment 2',
                    content: 'Lorem ipsum dolor sit amet 2',
                    postId: 2 } ],
                readersInfo:
                  [ { id: 'as61389dadhga62343hads6712',
                    name: 'Author 1',
                    email: 'author1@posties.com',
                    password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                    age: 55 },
                    { id: '167asdf3689348sdad7312131s',
                      name: 'Author 2',
                      email: 'author2@posties.com',
                      password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                      age: 16 } ] } },
            { userId: '167asdf3689348sdad7312131s',
              postId: 1,
              updatedAt: 1480793101475,
              _include: [ 'post' ],
              _elapsed: { post: 1, total: 1 },
              post:
              { id: 1,
                title: 'Post 1',
                content: 'Lorem ipsum dolor sit amet 4',
                author: 'as61389dadhga62343hads6712',
                readers: [ 'as61389dadhga62343hads6712', '167asdf3689348sdad7312131s' ],
                createdAt: 1480793101559,
                _include: [ 'authorInfo', 'commentsInfo', 'readersInfo' ],
                _elapsed: { authorInfo: 2, commentsInfo: 2, readersInfo: 2, total: 2 },
                authorInfo:
                { id: 'as61389dadhga62343hads6712',
                  name: 'Author 1',
                  email: 'author1@posties.com',
                  password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                  age: 55 },
                commentsInfo:
                  [ { title: 'Comment 1',
                    content: 'Lorem ipsum dolor sit amet 1',
                    postId: 1 },
                    { title: 'Comment 3',
                      content: 'Lorem ipsum dolor sit amet 3',
                      postId: 1 } ],
                readersInfo:
                  [ { id: 'as61389dadhga62343hads6712',
                    name: 'Author 1',
                    email: 'author1@posties.com',
                    password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                    age: 55 },
                    { id: '167asdf3689348sdad7312131s',
                      name: 'Author 2',
                      email: 'author2@posties.com',
                      password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
                      age: 16 } ] } } ]
        );
      });
  });
});

// Helpers

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const util = require('util');
function inspect(desc, obj, depth) {
  if (desc) { console.log(desc); }
  console.log(util.inspect(obj, { depth: depth || 5, colors: true }));
}
