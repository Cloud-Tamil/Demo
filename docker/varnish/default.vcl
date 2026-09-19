vcl 4.1;

import std;

backend default {
    .host = "nginx";
    .port = "8080";
    .first_byte_timeout = 600s;
    .between_bytes_timeout = 600s;
    .connect_timeout = 10s;
    .probe = {
        .url = "/health_check.php";
        .timeout = 2s;
        .interval = 5s;
        .window = 5;
        .threshold = 3;
    }
}

acl purge {
    "127.0.0.1";
    "localhost";
    "php";
    "10.0.0.0"/8;
    "172.16.0.0"/12;
    "192.168.0.0"/16;
}

sub vcl_recv {
    if (req.method == "PURGE") {
        if (!client.ip ~ purge) {
            return (synth(405, "Method not allowed"));
        }
        if (!req.http.X-Magento-Tags-Pattern) {
            return (synth(400, "X-Magento-Tags-Pattern header required"));
        }
        ban("obj.http.X-Magento-Tags ~ " + req.http.X-Magento-Tags-Pattern);
        return (synth(200, "Purged"));
    }

    if (req.method != "GET" &&
        req.method != "HEAD" &&
        req.method != "PUT" &&
        req.method != "POST" &&
        req.method != "TRACE" &&
        req.method != "OPTIONS" &&
        req.method != "DELETE") {
        return (pipe);
    }

    # Pass dynamic requests, checkout, and admin
    if (req.url ~ "^/(pub/)?(admin|checkout|customer|graphql|rest)") {
        return (pass);
    }

    # Static assets bypass
    if (req.url ~ "^/(pub/)?(static|media)/") {
        return (hash);
    }

    return (hash);
}

sub vcl_backend_response {
    # Set TTL based on Magento Cache-Control headers
    if (beresp.http.Cache-Control ~ "private" || beresp.http.X-Magento-Debug) {
        set beresp.uncacheable = true;
        set beresp.ttl = 86400s;
        return (deliver);
    }

    if (beresp.http.X-Magento-Tags) {
        set beresp.grace = 1h;
    }

    return (deliver);
}

sub vcl_deliver {
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
    } else {
        set resp.http.X-Cache = "MISS";
    }
    unset resp.http.X-Magento-Debug;
    unset resp.http.X-Magento-Tags;
    return (deliver);
}
