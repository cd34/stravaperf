//var root_url = 'http://app.strava.com';
//var root_url = 'http://devel.mia.colo-cation.com:6081';
var root_url = 'http://stravaperf.cd34.com';

angular.module('strava', []).
  config(['$routeProvider', function($routeProvider) {
  $routeProvider.
    when('/about', {templateUrl: 'partials/about.html'}).
    when('/others', {templateUrl: 'partials/others.html'}).
    when('/segments/:athlete', {templateUrl: 'partials/segment-list.html',
      controller: SegmentListCtrl}).
    when('/segment/:athlete/:segmentId', {
      templateUrl: 'partials/segment-detail.html',
      controller: SegmentDetailCtrl}).
    when('/', {templateUrl: 'partials/index.html', controller: URLCtrl}).
    otherwise({redirectTo: '/'});
}]);

var formatTime = d3.time.format("%H:%M"),
  formatMinutes = function(d) { 
    return formatTime(new Date(2012, 0, 1, 0, d)); 
  };

function drawGraph(data) {
    var width = 700,
        height = 400,
        margin = 60,
        domain_margin = 10;

    var sorted_efforts = data.efforts.map(function (x) {
      return x;
    }).sort(function(a,b){return a.id-b.id});

    x_domain = sorted_efforts.map(function (x) {
      return new Date(x.startDate).valueOf();
    });
    y_domain = sorted_efforts.map(function (x) {
      return x.elapsedTime;
    });
    var seg_data = [];
    for (i=0; i<x_domain.length; i++) {
      seg_data[i] = y_domain[i];
    }
    var x_values = [];
    for (loop=0;loop<x_domain.length;loop++) {
      x_values.push(loop);
    }
    var t = BestFit(x_values, y_domain);
    var slope=-t[0], y_int=t[1];
    var left_x = 0;
    var left_y = y_int - domain_margin;
    var right_x = width;
    var right_y = x_domain.length * (-1 * slope) + y_int - domain_margin;
    var trend_color = 'rgb(0,102,0)';
    if (slope < 0) {
      trend_color = 'rgb(255,0,0)';
    }

    var x = d3.scale.linear()
      .domain([0, seg_data.length - 1])
      .range([0, width]);

    var y = d3.scale.linear()
      .domain([d3.max(y_domain) + domain_margin, 
        d3.min(y_domain) - domain_margin])
      .range([height, 0]);

    var symbol = d3.scale.ordinal().range(d3.svg.symbolTypes);

    var vis = d3.select("div#chart")
      .append("svg")
      .attr("width", width + margin * 2)
      .attr("height", height + margin * 2)
      .append("g")
      .attr("transform", "translate(" + margin + "," + margin + ")");

    var xrule = vis.selectAll("g.x")
      .data(x.ticks(10))
      .enter().append("g")
      .attr("class", "x");

    xrule.append("line")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", 0)
      .attr("y2", height);

    var yrule = vis.selectAll("g.y")
      .data(y.ticks(10))
      .enter().append("g")
      .attr("class", "y");

    yrule.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", y)
      .attr("y2", y);

    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickFormat(formatMinutes);

    vis.append("rect")
      .attr("width", width)
      .attr("height", height);

    vis.append("g")
      .call(yAxis);

    var line = d3.svg.line()
      .x(function(d,i) { 
        return x(i); 
      })
      .y(function(d) { 
        return y(d); 
      })
    vis.append("svg:path").attr("d", line(seg_data));

    vis.append('svg:line')
    .attr('x1', left_x)
    .attr('y1', left_y) 
    .attr('x2', right_x)
    .attr('y2', right_y)
    .style('stroke', trend_color)
    .style('stroke-width', '3');
}

var segment_data = new Array();
function SegmentData($http, $scope, url) {
  $http.get(url).success(function(data, status, headers, config) {
    if (data.efforts.length > 1) {
      segment_data.push.apply(segment_data, data.efforts);
      var temp = data.efforts.map(function (x) {
        return new Date(x.startDate).valueOf();
      }).sort(function(a,b){return a-b});
      var last_date = new Date(temp[0]).toISOString().substr(0,10);
      var pos_and = url.indexOf('&');
      if (pos_and != -1) {
        url = url.substring(0, pos_and);
      }
      url += '&endDate='+last_date;
      SegmentData($http, $scope, url);
    } else {
      $scope.segment_name = data.segment;
      data.efforts = segment_data
      drawGraph(data);
    }
  });
}

function SegmentDetailCtrl($scope, $route, $routeParams, $http) {
  segment_data = new Array();
  var url = root_url + '/api/v1/segments/' + $routeParams['segmentId'] + '/efforts?athleteId=' + $routeParams['athlete'];
  $scope.athlete = $routeParams['athlete'];

  SegmentData($http, $scope, url);
}

function asyncSegmentFetch(segment_data, scope, $http, $q) {
  var deferred = $q.defer();

  setTimeout(function() {
    scope.$apply(function() {
      if (segmentsFetched()) {
        deferred.resolve(segment_data);
      } else {
        deferred.reject('No data received');
      }
    });
  }, 1000);
 
  return deferred.promise;
}

var strava_fetch_done = false;
function segmentsFetched() {
  return strava_fetch_done;
}

function SegmentListCtrl($scope, $routeParams, $http, $q) {
  var segment_data = {};
  $scope.athlete = $routeParams['athlete'];

  var promise = asyncSegmentFetch(segment_data, $scope, $http, $q);
  promise.then(function(data) {
    var d = {};
    angular.forEach(data, function (x) {
      if (x.count > 4) {
        d[x.name] = x;
      }
    });
    $scope.segments = d;
  }, function(reason) {
    alert('Failed: ' + reason);
  });

  var url = root_url + '/api/v1/rides?athleteId=' + $routeParams['athlete'];
  $http.get(url).success(function(data, status, headers, config) {

    angular.forEach(data.rides, function(record) {
      var ride_url = root_url + '/api/v1/rides/' + record['id'] + '/efforts';
      $http.get(ride_url).success(function(data, status, headers, config) {
        angular.forEach(data.efforts, function(segments) {
          angular.forEach(segments, function(segment) {
            if (segment.name) {
              if (!segment_data[segment.name]) {
                segment_data[segment.name] = {'id':segment.id, 'count':1, 
                    'name':segment.name};
              } else {
                segment_data[segment.name]['count']++;
              }
            };
          });
        });
      });
    });
  }).then(function(d) {
    strava_fetch_done = true;
  });
}

function URLCtrl($scope, $http) {
  $scope.master= {};
  //$scope.text = 'http://app.strava.com/athletes/653078';
 
  $scope.update = function(user) {
    $scope.master= angular.copy(user);

    var ath_regexp = /http:\/\/app.strava.com\/athletes\/([0-9]+)$/;
    var athlete = ath_regexp.exec(user)[1];
    window.location = '#/segments/' + athlete;
  };
}
