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

  var inArray = function(arr, val) {
    return arr.indexOf(val) !== -1;
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

  // thanks raynos!
  // https://github.com/Raynos/xtend
  var extend = function() {
    var target = {};
    for (var i = 0; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key]
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
    fn.type = type;
    return fn;
  };

  var countMap = function(val, memo) {
    if (!memo) memo = {};
    if (typeof memo[val] === 'undefined') {
      memo[val] = 1;
    } else {
      memo[val]++;
    }
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

  var addValue = function(obj, key, val) {
    var o = {};
    if (typeof obj[key] === 'undefined') {
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

  //  Conditionals

  var AndCondition = make('conditional', function() {
    var subs = toArray(arguments);
    return function(data, settings, options) {
      var sets = [];

      each(subs, function(sub) {
        sets.push(sub(data, settings, options));
      });

      return existsInAll(sets, function(entry) {
        return entry.id;
      });
    };
  });

  var OrCondition = make('conditional', function() {
    var subs = toArray(arguments);
    return function(data, settings, options) {
      var sets = [];

      each(subs, function(sub) {
        sets.push(sub(data, settings, options));
      });

      return existsInSome(sets, function(entry) {
        return entry.id;
      });
    };
  });

  // Filters

  var TermsOrFilter = make('filter', function(name, field) {
    return function(data, settings, options) {
      if (typeof settings[field] === 'undefined') return [];
      var input = settings[field];
      var entries = {};
      if (isArray(options.skip) && inArray(options.skip, name)) return data;
      if (!isArray(input)) input = [input];

      each(data, function(entry) {
        if (entries[entry.id]) return;
        var arr = (!isArray(entry[field]) && !isObject(entry[field])) ? [entry[field]] : entry[field];

        each(arr, function(val) {
          return each(input, function(inp) {
            if (val === inp) {
              entries[entry.id] = entry;
              return false;
            }
          });
        });
      });

      return objToArray(entries);
    };
  });

  var TermsAndFilter = make('filter', function(name, field) {
    return function(data, settings, options) {
      if (typeof settings[field] === 'undefined') return data;
      var input = settings[field];
      var entries = {};
      if (isArray(options.ignore) && inArray(options.skip, name)) return data;
      if (!isArray(input)) input = [input];

      each(data, function(entry) {
        if (entries[entry.id]) return;
        var arr = (!isArray(entry[field]) && !isObject(entry[field])) ? [entry[field]] : entry[field];
        var isInAll = true;

        each(input, function(inp) {
          if (!inArray(arr, inp)) {
            isInAll = false;
            return false;
          }
        });

        if (isInAll) entries[entry.id] = entry;
      });

      return objToArray(entries);
    };
  });

  var CustomFilter = make('filter', function(name, fn) {
    return function(data, settings, options) {
      var input = settings[name];
      var entries = {};
      if (isArray(options.ignore) && inArray(options.skip, name)) return data;

      each(data, function(entry) {
        if (entries[entry.id]) return;
        if (fn(entry, input)) entries[entry.id] = entry;
      });

      return objToArray(entries);
    };
  });

  // Aggregators

  var TermsAggregator = make('aggregator', function(name, field, ignore) {
    return function(results, data, settings, filters) {
      var buckets = {};
      var terms = uniqueValues(data, field);
      each(terms, function(term) {
        var tmp = addValue(settings, field, term);
        var entries = filters(data, tmp, { skip: ignore });
        buckets[term] = entries.length;
      });
      return {
        name: name,
        buckets: buckets
      };
    };
  });

  var Filteramo = function() {
    var filters;
    var aggregations;

    return {

      filters: function() {
        var args = toArray(arguments);
        if (args.length > 1 ||  (args.length === 1 &&args[0].type !== 'conditional')) {
          // use the And Conditional by default
          args = AndCondition.apply(null, args);
        }
        filters = args;
        return this;
      },

      aggregations: function() {
        aggregations = toArray(arguments);
        return this;
      },

      run: function(data, settings, opts) {
        if (!opts) opts = {};
        if (!settings) settings = {};
        var results = filters(data, settings, opts);
        var aggResults = {};
        var ret = {
          results: results
        };

        if (isArray(aggregations)) {
          each(aggregations, function(aggregator) {
            var ret = aggregator(results, data, settings, filters);
            aggResults[ret.name] = ret.buckets;
          });
          ret.aggregations = aggResults;
        }

        return ret;
      }
    };
  };

  Filteramo.AndCondition = AndCondition;
  Filteramo.OrCondition = OrCondition;
  Filteramo.TermsOrFilter = TermsOrFilter;
  Filteramo.TermsAndFilter = TermsAndFilter;
  Filteramo.CustomFilter = CustomFilter;
  Filteramo.TermsAggregator = TermsAggregator;

  // Node.js / browserify
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Filteramo;
  }
  // <script>
  else {
    glob.Filteramo = Filteramo;
  }

}(this);