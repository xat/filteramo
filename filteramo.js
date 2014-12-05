!function(glob) {

  var toArray = function(arr) {
    return [].slice.call(arr);
  };

  var capitalize = function(str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
  };

  var isType = function(val, type) {
    return (Object.prototype.toString.call( val ) === '[object '+capitalize(type)+']');
  };

  var isArray = function(val) {
    return isType(val, 'array');
  };

  var isObject = function(val) {
    return isType(val, 'object');
  };

  var isString = function(val) {
    return isType(val, 'string');
  };

  var isFunction = function(val) {
    return isType(val, 'function');
  };

  var isNumber = function(val) {
    return isType(val, 'number');
  };

  var isUndefined = function(val) {
    return typeof val === 'undefined';
  };

  var inArray = function(arr, val) {
    return arr.indexOf(val) !== -1;
  };

  var contains = function(needle, hay) {
    return hay.indexOf(needle) > -1;
  };

  var arrayContains = function(needle, arr) {
    var matches = false;
    each(arr, function(val) {
      if (contains(needle, val)) {
        matches = true;
        return false;
      }
    });
    return matches;
  };

  var returnFirstArg = function(val) {
    return val;
  };

  var objToArray = function(obj) {
    var arr = [];
    each(obj, function(entry) {
      arr.push(entry);
    });
    return arr;
  };

  var objectKeys = function(obj) {
    if (Object.keys) return Object.keys(obj);
    var keys = [];
    each(obj, function(val, key) {
      keys.push(key);
    });
    return keys;
  };

  var arrify = function(val) {
    return !isArray(entry[field]) ? [val] : val;
  };

  // thanks raynos!
  // https://github.com/Raynos/xtend
  var extend = function() {
    var target = {};
    for (var i = 0; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };

  var each = function(arr, fn) {
    var i, len;
    if (isArray(arr)) {
      for (i=0, len=arr.length; i<len; i++) {
        if (fn(arr[i], i) === false) return false;
      }
      return;
    }

    for (i in arr) {
      if (!arr.hasOwnProperty(i)) continue;
      if (fn(arr[i], i) === false) return false;
    }
  };

  var make = function(type, fn) {
    return function() {
      var ret = fn.apply(this, toArray(arguments));
      ret.type = type;
      return ret;
    };
  };

  var countMap = function(val, memo) {
    if (!memo) memo = {};
    if (isUndefined(memo[val])) {
      memo[val] = 1;
    } else {
      memo[val]++;
    }
    return memo;
  };

  var bucketMap = function(entry, key, memo) {
    if (!memo) memo = {};
    var arr = arrify(entry[key]);
    each(arr, function(val) {
      if (!isString(val)) return;
      if (isUndefined(memo[val])) memo[val] = {};
      memo[val][entry.id] = entry;
    });
    return memo;
  };

  var uniqueValues = function(arr, field, memo) {
    if (!memo) memo = {};
    each(arr, function(entry) {
      var vals = (!isArray(entry[field]) && !isObject(entry[field])) ? [entry[field]] : entry[field];
      each(vals, function(val) {
        memo[val] = true;
      });
    });
    return objectKeys(memo);
  };

  var appliesToAll = function(arr, fn) {
    var existsInAll = true;
    each(arr, function(val, idx) {
      if (!fn(val, idx)) {
        existsInAll = false;
        return false;
      }
    });
    return existsInAll;
  };

  // TODO: Rework this mess of a function
  var addValue = function(obj, key, val) {
    var o = {};
    if (isUndefined(obj[key])) {
      o[key] = val;
      return extend(obj, o);
    }
    if (!isArray(obj[key]) && !isObject(obj[key])) {
      if (obj[key] === val) {
        return extend(obj, o);
      }
      o[key] = [obj[key], val];
    }
    if (isArray(obj[key])) {
      if (inArray(obj[key], val)) {
        return extend(obj, o);
      }
      o[key] = toArray(obj[key]);
      o[key].push(val);
      return extend(obj, o);
    }
    // TODO: Handle Object-Case.
    return extend(obj, o);
  };

  var existsInAll = function(sets, fn) {
    var counters = {};
    var entries = {};
    var len = sets.length;
    var ids = [];

    each(sets, function(arr) {
      each(arr, function(entry) {
        var key = fn(entry);
        entries[key] = entry;
        countMap(key, counters);
      });
    });

    each(counters, function(entry, key) {
      if (entry === len) ids.push(key);
    });

    return ids.map(function(id) {
      return entries[id];
    });
  };

  var existsInSome = function(sets, fn) {
    var entries = {};

    each(sets, function(arr) {
      each(arr, function(entry) {
        var key = fn(entry);
        entries[key] = entry;
      });
    });

    return objToArray(entries);
  };

  var exists = function(val) {
    if (val === null || isUndefined(val)) {
      return false;
    }
    if (isArray(val) && !val.length) {
      return false;
    }
    return true;
  };

  var appendAgg = function(raw, obj) {
    if (isUndefined(obj.aggs)) obj.aggs = {};
    obj.aggs[raw.name] = raw.result;
    return obj;
  };

  // Queries

  var MatchQuery = make('query', function(fields, query) {
    fields = !isArray(fields) ? [fields] : fields;
    return function(data) {
      return data.filter(function(entry) {
        var matches = false;
        each(fields, function(field) {
          var val = entry[field];
          if (!query
            || query === ''
            || (val == query)
            || (isString(val) && contains(query, val))
            || (isArray(val) && arrayContains(query, val))) {
              matches = true;
              return false;
            }
          });
          return matches;
        });
      };
    });

  //  Filters

  var AndFilter = make('filter', function() {
    var subs = toArray(arguments);
    return function(data) {
      var sets = [];

      each(subs, function(sub) {
        sets.push(sub(data, settings));
      });

      return existsInAll(sets, function(entry) {
        return entry.id;
      });
    };
  });

  var OrFilter = make('filter', function() {
    var subs = toArray(arguments);
    return function(data) {
      var sets = [];

      each(subs, function(sub) {
        sets.push(sub(data));
      });

      return existsInSome(sets, function(entry) {
        return entry.id;
      });
    };
  });

  var TermsFilter = make('filter', function(field, terms) {
    return function(data) {
      var entries = {};

      each(data, function(entry) {
        if (entries[entry.id]) return;
        var arr = arrify(entries[entry.id]);
        var isInAll = appliesToAll(terms, function(term) {
          return inArray(arr, term);
        });
        if (isInAll) entries[entry.id] = entry;
      });

      return objToArray(entries);
    };
  });

  var TermFilter = make('filter', function(field, term) {
    return function(data) {
      var entries = {};

      each(data, function(entry) {
        if (entries[entry.id]) return;
        var arr = arrify(entries[entry.id]);
        if (inArray(arr, term)) entries[entry.id] = entry;
      });

      return objToArray(entries);
    };
  });

  var IdsFilter = make('filter', function(field, ids) {
    ids = arrify(ids);
    return function(data) {
      return data.filter(function(entry) {
        return inArray(ids, entry.id);
      });
    };
  });

  var RangeFilter = make('filter', function(field, gt, lt) {
    return function(data) {
      return data.filter(function(entry) {
        return entry[field] > gt && entry[field] < lt;
      });
    };
  });

  var ExistsFilter = make('filter', function(field) {
    return function(data) {
      return data.filter(function(entry) {
        return exists(entry[field]);
      });
    };
  });

  var MissingFilter = make('filter', function(field) {
    return function(data) {
      return data.filter(function(entry) {
        return !exists(entry[field]);
      });
    };
  });

  var RegexpFilter = make('filter', function(field, regex) {
    return function(data) {
      return data.filter(function(entry) {
        return !!str.match(regex);
      });
    };
  });

  // Aggregators

  var TermsAggregator = make('aggregator', function(name, field, sub) {
    var hasSub = isFunction(sub);
    return function(data) {
      var buckets = {};

      each(data, function(entry) {
        bucketMap(entry, field, buckets);
      });

      each(buckets, function(bucket, term) {
        buckets[term] = objToArray(buckets[term]);
      });

      each(buckets, function(bucket, term) {
        buckets[term] = {
          count: bucket.length
        };

        if (hasSub) appendAgg(sub(bucket), buckets[term]);
      });

      return {
        name: name,
        result: {
          buckets: buckets
        }
      };
    };
  });

  var MinAggregator = make('aggregator', function(name, field) {
    return function(data) {
      var min;

      each(data, function(entry) {
        if (!isNumber(entry[field])) return;
        if (isUndefined(min) || entry[field] < min) {
          min = entry[field];
        }
      });

      return {
        name: name,
        result: {
          min: min
        }
      };
    };
  });

  var MaxAggregator = make('aggregator', function(name, field) {
    return function(data) {
      var max;

      each(data, function(entry) {
        if (!isNumber(entry[field])) return;
        if (isUndefined(max) || entry[field] > max) {
          max = entry[field];
        }
      });

      return {
        name: name,
        result: {
          max: max
        }
      };
    };
  });

  var SumAggregator = make('aggregator', function(name, field) {
    return function(data) {
      var sum = 0;

      each(data, function(entry) {
        if (!isNumber(entry[field])) return;
        entry[field] += sum;
      });

      return {
        name: name,
        result: {
          sum: sum
        }
      };
    };
  });

  var AvgAggregator = make('aggregator', function(name, field) {
    return function(data) {
      var sum = 0;

      each(data, function(entry) {
        if (!isNumber(entry[field])) return;
        entry[field] += sum;
      });

      return {
        name: name,
        result: {
          avg: sum / data.length
        }
      };
    };
  });

  var runAggregators = function(aggregators, data, queried, filters, settings) {
    var results = {};
    if (!isArray(aggregators)) return results;
    each(aggregators, function(aggregator) {
      var ret = aggregator(data, queried, settings, filters);
      results[ret.name] = ret.buckets;
    });
    return results;
  };

  var Filteramo = function() {
    var filters;
    var aggregators;
    var query;

    return {

      filters: function() {
        var args = toArray(arguments);
        if (args.length > 1 ||  (args.length === 1 && args[0].type !== 'conditional')) {
          // use the And Conditional by default
          filters = AndCondition.apply(null, args);
        } else {
          filters = args[0];
        }
        return this;
      },

      query: function(q) {
        query = q;
        return this;
      },

      aggregators: function() {
        aggregators = toArray(arguments);
        return this;
      },

      compile: function(data) {
        return function(settings) {
          if (!settings) settings = {};
          if (!filters) filters = returnFirstArg;
          if (!query) query = returnFirstArg;
          var queried = query ? query(data, settings.query) : data;
          return {
            settings: settings,
            results: filters(queried, settings.filters || {}),
            aggregations: runAggregators(aggregators, data, queried, filters, settings)
          };
        };
      }
    };
  };

  Filteramo.AndCondition = AndCondition;
  Filteramo.OrCondition = OrCondition;
  Filteramo.TermsOrFilter = TermsOrFilter;
  Filteramo.TermsAndFilter = TermsAndFilter;
  Filteramo.MatchQuery = MatchQuery;
  Filteramo.CustomFilter = CustomFilter;
  Filteramo.TermAggregator = TermAggregator;
  Filteramo.TermsAggregator = TermsAggregator;

  // Node.js / browserify
  if (!isUndefined(module) && module.exports) {
    module.exports = Filteramo;
  }
  // <script>
  else {
    glob.Filteramo = Filteramo;
  }

}(this);
