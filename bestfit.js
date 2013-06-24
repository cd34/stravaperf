// returns slope, y-intercept

function BestFit (x, y) {
  var xy = [], 
      xsq = [],
      sum_x = 0,
      sum_y = 0,
      sum_xy = 0,
      sum_xsq = 0;

  for(loop=0;loop<x.length;loop++) {
    sum_x += x[loop];
    sum_y += y[loop];
    sum_xy += x[loop] * y[loop];
    sum_xsq += x[loop] * x[loop];
  }

  var m = ((sum_xy - ( sum_x * sum_y) / x.length) ) / 
          (sum_xsq - ( sum_x * sum_x) / x.length);

  var y_int = (sum_y / x.length) - (m * (sum_x / x.length));

  return ([m, y_int]);
}
