
import errors from 'feathers-errors';
import { getItems, replaceItems, getByDot, checkContext } from 'feathers-hooks-common/lib/utils';
// import { populate as legacyPopulate } from 'feathers-hooks-common';

export const populate = (options, ...rest) => hook => {
  const optionsDefault = {
    schema: {},
    checkPermissions: () => true,
    profile: false
  };

  if (typeof options === 'string') {
    // return legacyPopulate(options, ...rest);
  }

  return Promise.resolve()
    .then(() => {
      // 'options.schema' resolves to { permissions: '...', include: [ ... ] }

      checkContext(hook, 'after', null, 'populate');
      const items = getItems(hook);

      const options1 = Object.assign({}, optionsDefault, options);
      const { schema, checkPermissions } = options1;
      const schema1 = typeof schema === 'function' ? schema(hook, options1) : schema;
      const permissions = schema1.permissions || null;

      if (typeof checkPermissions !== 'function') {
        throw new errors.BadRequest('Permissions param is not a function. (populate)');
      }

      if (permissions && !checkPermissions(hook, hook.path, permissions, 0)) {
        throw new errors.BadRequest('Permissions do not allow this populate. (populate)');
      }

      if (typeof schema1 !== 'object') {
        throw new errors.BadRequest('Schema does not resolve to an object. (populate)');
      }

      return !schema1.include || !Object.keys(schema1.include).length ? items
        : populateItemArray(options1, hook, items, schema1.include, 0);
    })
    .then(items => {
      replaceItems(hook, items);
      return hook;
    });
};

function populateItemArray (options, hook, items, includeSchema, depth) {
  // 'items' is an item or an array of items
  // 'includeSchema' is like [ { nameAs: 'author', ... }, { nameAs: 'readers', ... } ]

  if (!Array.isArray(items)) {
    return populateItem(options, hook, items, includeSchema, depth + 1);
  }

  return Promise.all(
    items.map(item => populateItem(options, hook, item, includeSchema, depth + 1))
  );
}

function populateItem (options, hook, item, includeSchema, depth) {
  // 'item' is one item
  // 'includeSchema' is like [ { nameAs: 'author', ... }, { nameAs: 'readers', ... } ]

  const elapsed = {};
  const startAtAllIncludes = process.hrtime();
  item._include = [];

  return Promise.all(
    includeSchema.map(childSchema => {
      const startAtThisInclude = process.hrtime();
      return populateAddChild(options, hook, item, childSchema, depth)
        .then(result => {
          const nameAs = childSchema.nameAs || childSchema.service;
          elapsed[nameAs] = getElapsed(options, startAtThisInclude, depth);

          return result;
        });
    })
  )
    .then(children => {
      // 'children' is like [{ authorInfo: {...}, readersInfo: [{...}, {...}] }]
      if (options.profile !== false) {
        elapsed.total = getElapsed(options, startAtAllIncludes, depth);
        item._elapsed = elapsed;
      }

      return Object.assign(item, ...children);
    });
}

function populateAddChild (options, hook, parentItem, childSchema, depth) {
  /*
  'parentItem' is the item we are adding children to
  'childSchema' is like
    { service: 'comments',
      permissions: '...',
      nameAs: 'comments',
      asArray: true,
      parentField: 'id',
      childField: 'postId',
      query: { $limit: 5, $select: ['title', 'content', 'postId'], $sort: { createdAt: -1 } },
      select: (hook, parent, depth) => ({ something: { $exists: false }}),
    }
  */

  // note: parentField & childField are req'd, plus parentItem[parentField} !== undefined .
  // childSchema.select may override their relationship but some relationship must be given.
  if (!childSchema.service || !childSchema.parentField || !childSchema.childField) {
    throw new errors.BadRequest('Child schema is missing a required property. (populate)');
  }

  if (childSchema.permissions &&
    !options.checkPermissions(hook, childSchema.service, childSchema.permissions, depth)
  ) {
    throw new errors.BadRequest(
      `Permissions for ${childSchema.service} do not allow include. (populate)`
    );
  }

  const nameAs = childSchema.nameAs || childSchema.service;
  parentItem._include.push(nameAs);

  let promise = Promise.resolve()
    .then(() => (childSchema.select ? childSchema.select(hook, parentItem, depth) : {}))
    .then(selectQuery => {
      const parentVal = getByDot(parentItem, childSchema.parentField);

      if (parentVal === undefined) {
        throw new errors.BadRequest(
          `ParentField ${childSchema.parentField} for ${nameAs} depth ${depth} is undefined. (populate)`
        );
      }

      const query = Object.assign({},
        childSchema.query,
        { [childSchema.childField]: Array.isArray(parentVal) ? { $in: parentVal } : parentVal },
        selectQuery // dynamic options override static ones
      );

      const serviceHandle = hook.app.service(childSchema.service);

      if (!serviceHandle) {
        throw new errors.BadRequest(`Service ${childSchema.service} is not configured. (populate)`);
      }

      return serviceHandle.find({ query });
    })
    .then(result => {
      result = result.data || result;

      if (result.length === 1 && !childSchema.asArray) {
        result = result[0];
      }

      return result;
    });

  if (childSchema.include) {
    promise = promise
      .then(items => populateItemArray(options, hook, items, childSchema.include, depth));
  }

  return promise
    .then(items => ({ [nameAs]: items }));
}

export const dePopulate = () => hook => {
  const items = getItems(hook);

  (Array.isArray(items) ? items : [items]).forEach(item => {
    if ('_computed' in item) {
      item._computed.forEach(key => { delete item[key]; });
      delete item._computed;
    }

    if ('_include' in item) {
      item._include.forEach(key => { delete item[key]; });
      delete item._include;
    }

    delete item._elapsed;
  });

  replaceItems(hook, items);
  return hook;
};

// Helpers

function getElapsed (options, startHrtime, depth) {
  if (options.profile === true) {
    const elapsed = process.hrtime(startHrtime);
    return elapsed[0] * 1e9 + elapsed[1];
  } else if (options.profile !== false) {
    return depth; // for testing _elapsed
  }
}
