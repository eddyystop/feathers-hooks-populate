
import { getItems, replaceItems, getByDot, setByDot } from 'feathers-hooks-common/lib/utils';

export const serialize = schema => hook => {
  schema = typeof schema === 'function' ? schema(hook) : schema;
  const schemaDirectives = ['computed', 'exclude', 'only'];

  replaceItems(hook, serializeItems(getItems(hook), schema));
  return hook;

  function serializeItems (items, schema) {
    if (!Array.isArray(items)) {
      return serializeItem(items, schema);
    }

    return items.map(item => serializeItem(item, schema));
  }

  function serializeItem (item, schema) {
    const computed = {};
    Object.keys(schema.computed || {}).forEach(name => {
      computed[name] = schema.computed[name](item, hook); // needs closure
    });

    let only = schema.only;
    only = typeof only === 'string' ? [only] : only;
    if (only) {
      const newItem = {};
      only.concat('_include', '_elapsed', item._include || []).forEach(key => {
        setByDot(newItem, key, getByDot(item, key), true);
      });
      item = newItem;
    }

    let exclude = schema.exclude;
    exclude = typeof exclude === 'string' ? [exclude] : exclude;
    if (exclude) {
      exclude.forEach(key => {
        setByDot(item, key, undefined, true);
      });
    }

    const _computed = Object.keys(computed);
    item = Object.assign({}, item, computed, _computed.length ? { _computed } : {});

    Object.keys(schema).forEach(key => {
      if (!schemaDirectives.includes(key) && typeof item[key] === 'object') { // needs closure
        item[key] = serializeItems(item[key], schema[key]);
      }
    });

    return item;
  }
};
