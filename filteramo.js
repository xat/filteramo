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

  var each = function(arr, fn) {
    var i, len;
    if (isArray(arr)) {
      for (i=0, len=arr.length; i<len; i++) {
        if (fn(arr[i], i) === false) break;
      }
      return;
    }

    for (i in arr) {
      if (!arr.hasOwnProperty(i)) continue;
      if (fn(arr[i], i) === false) break;
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

  var MultiFilter = make('filter', function(name, opts, fn) {
    return function(data, settings, options) {
      var input = settings[name];
      var entries = {};
      if (isArray(options.ignore) && inArray(options.skip, name)) return data;

      each(data, function(entry) {
        each(opts, function(opt, idx) {
          if (entries[entry.id]) return;
          if (fn(entry, input[idx], opt)) entries[entry.id] = entry;
        });
      });

      return objToArray(entries);
    };
  });

  var SingleFilter = make('filter', function(name, fn) {
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
      var entries = isArray(ignore) ? filters(data, settings, { skip: ignore }) : results;
      each(entries, function(entry) {
        if (isArray(entry[field]) || isType(entry[field], 'object')) {
          each(entry[field], function(val) {
            countMap(val, buckets);
          });
          return;
        }
        countMap(entry[field], buckets);
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

    var obj = {

      filters: function() {
        var args = toArray(arguments);
        if (args.length === 1 && args[0].type !== 'conditional') {
          // use the And Conditional by default
          args = AndCondition.apply(null, args);
        }
        filters = args;
        return obj;
      },

      aggregations: function() {
        aggregations = toArray(arguments);
        return obj;
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

    return obj;
  };

  Filteramo.AndCondition = AndCondition;
  Filteramo.OrCondition = OrCondition;
  Filteramo.MultiFilter = MultiFilter;
  Filteramo.SingleFilter = SingleFilter;
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