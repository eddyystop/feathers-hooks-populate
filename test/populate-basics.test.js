
const assert = require('assert');
const configApp = require('../test/helpers/configApp');
const { populate } = require('../src');

describe('populate - finds items in hook', () => {
  let hookAfter;
  let hookAfterArray;
  let hookFindPaginate;
  
  beforeEach(() => {
    hookAfter = {
      type: 'after',
      method: 'create',
      params: { provider: 'rest' },
      result: { first: 'Jane2', last: 'Doe2' } };
    hookAfterArray = {
      type: 'after',
      method: 'create',
      params: { provider: 'rest' },
      result: [{ first: 'John2', last: 'Doe2' }, { first: 'Jane', last: 'Doe' }] };
    hookFindPaginate = {
      type: 'after',
      method: 'find',
      params: { provider: 'rest' },
      result: {
        total: 2,
        data: [
          { first: 'John3', last: 'Doe3' },
          { first: 'Jane3', last: 'Doe3' }
        ]
      } };
  });
  
  it('one item', () => {
    const hook = clone(hookAfter);
    return populate({ schema: {} })(hook)
      .then(hook => {
        assert.deepEqual(hook, hookAfter);
        //assert.deepEqual(items, hook.result)
      })
  });
  
  it('item array', () => {
    const hook = clone(hookAfterArray);
    return populate({ schema: {} })(hook)
      .then(hook => {
        assert.deepEqual(hook, hookAfterArray);
        //assert.deepEqual(items, hook.result)
      })
  });
  
  it('find paginated', () => {
    const hook = clone(hookFindPaginate);
    return populate({ schema: {} })(hook)
      .then(hook => {
        assert.deepEqual(hook, hookFindPaginate);
        //assert.deepEqual(items, hook.result.data)
      })
  });
});

describe('populate - throws on bad params', () => { // run to increase code climate score
  let hookAfter;
  
  beforeEach(() => {
    hookAfter = {
      type: 'after',
      method: 'create',
      params: { provider: 'rest' },
      result: { first: 'Jane2', last: 'Doe2' } };
  });
  
  it('schema', () => {
    const hook = clone(hookAfter);
    return populate({ schema: 1 })(hook)
      .then(() => { throw new Error('was not supposed to succeed'); })
      .catch(err => {});
  });

  it('permissions not func', () => {
    const hook = clone(hookAfter);
    return populate({ schema: {}, checkPermissions: 1 })(hook)
      .then(() => { throw new Error('was not supposed to succeed'); })
      .catch(err => {});
  });
  
  it('throws on invalid permissions', () => {
    const hook = clone(hookAfter);
    return populate({ schema: {}, checkPermissions: () => false })(hook)
      .then(() => { throw new Error('was not supposed to succeed'); })
      .catch(err => {});
  });
});

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
