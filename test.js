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

  var termsFilter1 = Filteramo.TermsOrFilter('term_filter', 'term');
  var termsFilter2 = Filteramo.TermsOrFilter('term_filter2', 'term2');
  var termsAndFilter1 = Filteramo.TermsAndFilter('term_filter', 'term');

  it('TermsFilter', function() {
    var ramo = Filteramo();
    var ret;

    ramo.filters(termsFilter1);
    var compiled = ramo.compile(data);

    ret = compiled({ term: 'foo' });
    expect(ret.results.length).to.be.equal(3);

    ret = compiled({ term: 'moo' });
    expect(ret.results.length).to.be.equal(1);

    ret = compiled({ term: '' });
    expect(ret.results.length).to.be.equal(0);

    ret = compiled();
    expect(ret.results.length).to.be.equal(0);
  });

  it('combined Or Filters', function() {
    var ramo = Filteramo();
    var ret;
    ramo.filters(Filteramo.OrCondition(termsFilter1, termsFilter2));

    ret = ramo.compile(data)({ term: ['foo'], term2: 'blah' });
    expect(ret.results.length).to.be.equal(4);
  });

  it('combined And Filters', function() {
    var ramo = Filteramo();
    var ret;
    ramo.filters(Filteramo.AndCondition(termsFilter1, termsFilter2));
    ret = ramo.compile(data)({ term: ['foo'], term2: 'blah' });
    expect(ret.results.length).to.be.equal(0);
  });

  it('TermsAggregator with TermsAndFilter', function() {
    var ramo = Filteramo();
    var ret;

    ramo.filters(termsAndFilter1);
    ramo.aggregators(Filteramo.TermsAggregator('terms_agg', 'term'));

    ret = ramo.compile(data)({ term: ['foo'] });

    expect(ret.aggregations.terms_agg.foo).to.be.equal(3);
    expect(ret.aggregations.terms_agg.bar).to.be.equal(1);
  });

  it('TermsAggregator with TermsOrFilter', function() {
    var ramo = Filteramo();
    var ret;

    ramo.filters(termsFilter1);
    ramo.aggregators(Filteramo.TermsAggregator('terms_agg', 'term'));

    ret = ramo.compile(data)({ term: ['foo', 'bar'] });
    expect(ret.aggregations.terms_agg.foo).to.be.equal(4);
    expect(ret.aggregations.terms_agg.bar).to.be.equal(4);
  });

  it('TermAggregator with TermsAndFilter', function() {
    var ramo = Filteramo();
    var ret;

    ramo.filters(termsAndFilter1);
    ramo.aggregators(Filteramo.TermAggregator('terms_agg', 'term'));

    ret = ramo.compile(data)({ term: ['foo'] });

    expect(ret.aggregations.terms_agg.foo).to.be.equal(3);
    expect(ret.aggregations.terms_agg.bar).to.be.equal(2);
    expect(ret.aggregations.terms_agg.moo).to.be.equal(1);
  });

  it('MatchQuery', function() {
    var ramo = Filteramo();
    var ret;
    ramo.query(Filteramo.MatchQuery('term'));
    var compiled = ramo.compile(data);
    ret = compiled({ query: 'f' });
    expect(ret.results.length).to.be.equal(3);
    ret = compiled({ query: '' });
    expect(ret.results.length).to.be.equal(5);
    ret = compiled();
    expect(ret.results.length).to.be.equal(5);
  });

});
