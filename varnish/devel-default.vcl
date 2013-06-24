backend strava {
.host = "174.129.212.236";
.port = "80";
}

backend default {
.host = "66.244.144.216";
.port = "80";
}

sub vcl_recv {
  unset req.http.cookie;
  if (req.url ~ "\.(cur|gif|jpg|jpeg|swf|css|js|flv|mp3|mp4|pdf|ico|png)(\?.*|)$") {
     set req.url = regsub(req.url, "\?.*$", "");
     unset req.http.Accept-Encoding;
     unset req.http.Vary;
  }
  set req.backend=default;
  set req.http.host = "devel.mia.colo-cation.com";
  if (req.url ~ "^/api/") {
      set req.backend = strava;
      set req.http.host = "www.strava.com";
  }
}

sub vcl_fetch {
    unset beresp.http.set-cookie;
    unset beresp.http.Cache-Control;
    #set beresp.http.cache-control = "max-age=28800";

# URL Patterns
# /api/v1/segments/ cache indefinitely
# /api/v1/rides/' + record['id'] + '/efforts cache indefinitely
# /api/v1/rides cache for one hour
# js, css cache indefinitely
# html cache indefinitely

  set beresp.ttl = 1h;
  if (req.url ~ "/api/") {
    set beresp.ttl = 1w;
  }
  if (req.url ~ "/api/v1/rides\?") {
    set beresp.ttl = 1h;
  }
  if (req.url ~ "/api/v1/segments/") {
    set beresp.ttl = 24h;
  }
  if (req.url ~ "\.(cur|gif|jpg|jpeg|swf|css|js|flv|mp3|mp4|pdf|ico|png)(\?.*|)$") {
  }
    set beresp.ttl = 365d;
}

sub vcl_deliver {
   if (obj.hits > 0) {
     set resp.http.X-Cache = "HIT";
   } else {
     set resp.http.X-Cache = "MISS";
   }
}
