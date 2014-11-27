var expect = require('expect.js');
var Filteramo = require('./filteramo');

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

describe('Filteramo', function() {

  var data = [
    { id: 1, term: 'foo' },
    { id: 2, term: 'foo' },
    { id: 3, term: ['foo', 'bar', 'baz'] },
    { id: 4, term: 'moo' },
    { id: 5, term: 'bar', term2: 'blah' }
  ];

  var multiFilter = Filteramo.MultiFilter('term_filter', ['foo', 'bar', 'baz', 'moo'],
    function(entry, input) {
      if (isArray(entry['term'])) return inArray(entry['term'], input);
      return entry['term'] === input;
    }
  );

  var singleFilter1 = Filteramo.SingleFilter('term_filter', function(entry, input) {
    if (isArray(entry['term'])) return inArray(entry['term'], input);
    return entry['term'] === input;
  });

  var singleFilter2 = Filteramo.SingleFilter('term_filter2',
    function(entry, input) {
      if (isArray(entry['term2'])) return inArray(entry['term2'], input);
      return entry['term2'] === input;
    }
  );

  it('SingleFilter', function() {
    var ramo = Filteramo();
    var ret;

    ramo.filters(singleFilter1);

    ret = ramo.run(data, { term_filter: 'foo' });
    expect(ret.results.length).to.be.equal(3);

    ret = ramo.run(data, { term_filter: 'moo' });
    expect(ret.results.length).to.be.equal(1);

    ret = ramo.run(data, { term_filter: '' });
    expect(ret.results.length).to.be.equal(0);

    ret = ramo.run(data);
    expect(ret.results.length).to.be.equal(0);

  });

  it('MultiFilter', function() {
    var ramo = Filteramo();
    var ret;

    ramo.filters(multiFilter);

    ret = ramo.run(data, { term_filter: ['foo'] });
    expect(ret.results.length).to.be.equal(3);

    ret = ramo.run(data, { term_filter: ['moo'] });
    expect(ret.results.length).to.be.equal(1);
  });

  it('combined Or Filters', function() {
    var ramo = Filteramo();
    var ret;
    ramo.filters(Filteramo.OrCondition(multiFilter,singleFilter2));

    ret = ramo.run(data, { term_filter: ['foo'], term_filter2: 'blah' });
    expect(ret.results.length).to.be.equal(4);
  });

  it('combined And Filters', function() {
    var ramo = Filteramo();
    var ret;
    ramo.filters(Filteramo.AndCondition(multiFilter,singleFilter2));
    ret = ramo.run(data, { term_filter: ['foo'], term_filter2: 'blah' });
    expect(ret.results.length).to.be.equal(0);
  });

  it('TermsAggregator', function() {
    var ramo = Filteramo();
    var ret;

    ramo.filters(multiFilter);

    ramo.aggregations(Filteramo.TermsAggregator('terms_agg', 'term'));

    ret = ramo.run(data, { term_filter: ['foo'] });
    expect(ret.aggregations.terms_agg.foo).to.be.equal(3);
    expect(ret.aggregations.terms_agg.bar).to.be.equal(1);


    ret = ramo.run(data, { term_filter: ['foo', 'bar'] });
    expect(ret.aggregations.terms_agg.foo).to.be.equal(3);
    expect(ret.aggregations.terms_agg.bar).to.be.equal(2);
  });

});