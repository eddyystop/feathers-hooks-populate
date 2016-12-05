# feathers-hooks-populate

- [populate](#populate)
    - [Schema](#schema)
    - [Added properties](#added-properties)
    - [Advanced examples](#advanced-examples)
        - [Selecting schema based on UI needs](#selecting-schema-based-on-ui-needs)
        - [Using permissions](#using-permissions)
- [serialize](#serialize)
  - [Advanced example](#advanced-example)
- [dePopulate](#depopulate)

### populate
`populate(options: Object): HookFunc`

Populates items *recursively* to any depth. Supports 1:1, 1:n and n:1 relationships.

- Used as a **before** or **after** hook on any service method.
- Supports multiple result items, including paginated `find`.
- Permissions control what a user may see.
- Provides performance profile information.
- Backward compatible with the old Feathersjs `populate` hook.

```javascript
const schema = {
  permissions: '...',
  include: [
    {
      service: 'users',
      nameAs: 'authorItem',
      parentField: 'author',
      childField: 'id',
      include: [ ... ],
    },
    {
      service: 'comments',
      parentField: 'id',
      childField: 'postId',
      query: {
        $limit: 5,
        $select: ['title', 'content', 'postId'],
        $sort: {createdAt: -1}
      },
      select: (hook, parent, depth) => ({ $limit: 6 }),
      asArray: true,
    },
    {
      service: 'users',
      permissions: '...',
      nameAs: 'readers',
      parentField: 'readers',
      childField: 'id'
    }
  ],
};

module.exports.after = {
  all: populate({ schema, checkPermissions, profile: true })
};
````

Options

- `schema` [required, object or function] How to populate the items. [Details are below.](#schema)
    - Function signature `(hook: Hook, options: Object): Object`
    - `hook` The hook.
    - `options` The `options` passed to the populate hook.
- `checkPermissions` [optional, default () => true] Function to check if the user is allowed to perform this populate,
or include this type of item. Called whenever a `permissions` property is found.
    - Function signature `(hook: Hook, service: string, permissions: any, depth: number): boolean`
    - `hook` The hook.
    - `service` The name of the service being included, e.g. users, messages.
    - `permissions` The value of the permissions property.
    - `depth` How deep the include is in the schema. Top of schema is 0.
    - Return truesy to allow the include.
- `profile` [optional, default false] If `true`, the populated result is to contain a performance profile.
Must be `true`, truesy is insufficient.

#### Schema

The data currently in the hook will be populated according to the schema. The schema starts with:

```javascript
const schema = {
  permissions: '...',
  include: [ ... ]
};
```

- `permissions` [optional, any type of value] Who is allowed to perform this populate. See `checkPermissions` above.
- `include` [optional, array] Which services to join to the data.

##### Include

The `include` array has an element for each service to join. They each may have:

```javascript
{ service: 'comments',
  nameAs: 'commentItems',
  permissions: '...',
  parentField: 'id',
  childField: 'postId',
  query: {
    $limit: 5,
    $select: ['title', 'content', 'postId'],
    $sort: {createdAt: -1}
  },
  select: (hook, parent, depth) => ({ $limit: 6 }),
  asArray: true,
  include: [ ... ]
}
```

- `service` [required, string] The name of the service providing the items.
- `nameAs` [optional, string, default is service] Where to place the items from the join.
- `permissions` [optional, any type of value] Who is allowed to perform this join. See `checkPermissions` above.
- `parentId` [required, string] The name of the field in the parent item for the [relation](#relation).
Dot notation is allowed.
- `childField` [required, string] The name of the field in the child item for the [relation](#relation).
Dot notation is allowed and will result in a query like `{ 'name.first': 'John' }`
which is not suitable for all DBs.
You may use `query` or `select` to create a query suitable for your DB.
- `query` [optional, object] An object to inject into the query in `service.find({ query: { ... } })`.
- `select` [optional, function] A function whose result is injected into the query.
    - Function signature `(hook: Hook, parentItem: Object, depth: number): Object`
    - `hook` The hook.
    - `parentItem` The parent item to which we are joining.
    - `depth` How deep the include is in the schema. Top of schema is 0.
- `asArray` [optional, boolean, default false] Force a single joined item to be stored as an array.
- `include` [optional] The new items may themselves include other items. The includes are recursive.

Populate forms the query `[childField]: parentItem[parentField]` when the parent value is not an array.
This will include all child items having that value.

Populate forms the query `[childField]: { $in: parentItem[parentField] }` when the parent value is an array.
This will include all child items having any of those values.

A populate hook for, say, `posts` may include items from `users`.
Should the `users` hooks also include a populate,
that `users` populate hook will not be run for includes arising from `posts`.

#### Added properties

Some additional properties are added to populated items. The result may look like:

```javascript
{ ...
  _include: [ 'post' ],
  _elapsed: { post: 487947, total: 527118 },
  post:
    { ...
      _include: [ 'authorInfo', 'commentsInfo', 'readersInfo' ],
      _elapsed: { authorInfo: 321973, commentsInfo: 469375, readersInfo: 479874, total: 487947 },
      _computed: [ 'averageStars', 'views' ],
      authorInfo: { ... },
      commentsInfo: [ { ... }, { ... } ],
      readersInfo: [ { ... }, { ... } ]
} }
```

- `_include` The property names containing joined items.
- `_elapsed` The elapsed time, in nano-secs (divide by 1e*6 for ms), taken to perform each include,
as well as the total taken for them all.
This delay is mostly attributed to your DB.
- `_computed` The property names containing values computed by the `serialize` hook.

The `depopulate` hook uses these fields to remove all joined and computed values.
This allows you to then `service.patch()` the item in the hook.

#### Advanced examples

##### Selecting schema based on UI needs

Consider a Purchase Order item.
An Accounting oriented UI will likely want to populate the PO with Invoice items.
A Receiving oriented UI will likely want to populate with Receiving Slips.

Using a function for `schema` allows you to select an appropriate schema based on the need.
The following example shows how the client can ask for the type of schema it needs.

```javascript
// on client
purchaseOrders.get(id, { query: { $nonQueryParams: { schema: 'po-acct' }}}) // pass schema name to server
// or
purchaseOrders.get(id, { query: { $nonQueryParams: { schema: 'po-rec' }}})
````
```javascript
// on server
const poSchemas = {
  'po-acct': { /* populate schema for Accounting oriented PO */},
  'po-rec': { /* populate schema for Receiving oriented PO */}
};

purchaseOrders.before({
  all: hook => { // extract client schema info
    const nonQueryParams = hook.params.query.$nonQueryParams;
    if (nonQueryParams) {
      delete hook.params.query.$nonQueryParams;
      hook.parms = Object.assign({}, hook.params, nonQueryParams);
    }
  }
});
purchaseOrders.after({
  all: populate(() => poSchemas[hook.params.schema])
});
```

##### Using permissions

For a simplistic example,
assume `hook.params.users.permissions` is an array of the service names the user may use,
e.g. `['invoices', 'billings']`.
These can be used to control which types of items the user can see.

The following populate will only be performed for users whose `user.permissions` contains `'invoices'`.

```javascript
const schema = {
  include: [
    {
      service: 'invoices',
      permissions: 'invoices',
      ...
    }
  ]
};

purchaseOrders.after({
  all: populate(schema, (hook, service, permissions) => hook.params.user.permissions.includes(permissions))
});
```

## serialize
`serialize(schema: Object|Function): HookFunc`

Remove selected information from populated items. Add new computed information.
Intended for use with the `populate` hook.

```javascript
const schema = {
  only: 'updatedAt',
  computed: {
    commentsCount: (recommendation, hook) => recommendation.post.commentsInfo.length,
  },
  post: {
    exclude: ['id', 'createdAt', 'author', 'readers'],
    authorInfo: {
      exclude: ['id', 'password', 'age'],
      computed: {
        isUnder18: (authorInfo, hook) => authorInfo.age < 18,
      },
    },
    readersInfo: {
      exclude: 'id',
    },
    commentsInfo: {
      only: ['title', 'content'],
      exclude: 'content',
    },
  },
};
purchaseOrders.after({
  all: [ populate( ... ), serialize(schema) ]
});
```

Options

- `schema` [required, object or function] How to serialize the items.
    - Function signature `(hook: Hook): Object`
    - `hook` The hook.
    
The schema reflects the structure of the populated items.
The base items for the example above have [included](#include) `post` items,
which themselves have included `authorInfo`, `readersInfo` and `commentsInfo` items.

The schema for each set of items may have

- `only` [optional, string or array of strings] The names of the fields to keep in each item.
The names for included sets of items plus `_include` and `_elapsed` are not removed by `only`.
- `exclude` [optional, string or array of strings] The names of fields to drop in each item.
You may drop, at your own risk, names of included sets of items, `_include` and `_elapsed`.
- `computed` [optional, object with functions] The new names you want added and how to compute their values.
    - Object is like `{ name: func, ...}`
    - `name` The name of the field to add to the items.
    - `func` Function with signature `(item, hook)`.
        - `item` The item with all its initial values, plus all of its included items.
        The function can still reference values which will be later removed by `only` and `exclude`.
        - `hook` The hook passed to serialize.

#### Advanced example

Consider an Employee item.
The Payroll Manager would be permitted to see the salaries of other department heads.
No other person would be allowed to see them.

Using a function for `schema` allows you to select an appropriate schema based on the need.

Assume `hook.params.user.roles` contains an array of roles which the user performs.
The Employee item can be serialized differently for the Payroll Manager than for anyone else.

```javascript
const payrollSerialize = {
  'payrollMgr': { /* serialization schema for Payroll Manager */},
  'payroll': { /* serialization schema for others */}
};

employees.after({
  all: [
    populate( ... ),
    serialize(hook => payrollSerialize[
      hook.params.user.roles.contains('payrollMgr') ? 'payrollMgr' : 'payroll'
    ])    
  ]
});
```

## dePopulate
`dePopulate()`

Removes joined and computed properties, as well any profile information.
Populated and serialized items may, after dePopulate, be used in `service.patch(id, items)` calls.

- Used as a **before** or **after** hook on any service method.
- Supports multiple result items, including paginated `find`.
- Supports an array of keys in `field`.
