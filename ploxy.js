var http = require("http");
var fs = require("fs");
var url = require("url");

function printHelp() {
    console.log("ploxy <incoming [ip=0.0.0.0:]port> <outgoing host[:port=80]>");
    process.exit();
}

if(process.argv.length < 4) {
    printHelp();
}

var in_address = process.argv[2];
var out_address = process.argv[3];

// Work out defaults etc for in address
if(/^\d+$/.test(in_address)) {
    in_address = ["0.0.0.0", in_address];
} else if(/^.+:\d+$/.test(in_address)) {
    in_address = [in_address.replace(/:.*$/, ""), in_address.replace(/^.*:/, "")];
} else {
    printHelp();
}

// Work out defaults etc for out address
if(/^\d+$/.test(out_address)) {
    printHelp();
} else if(/^.+:\d+$/.test(out_address)) {
    out_address = [out_address.replace(/:.*$/, ""), out_address.replace(/^.*:/, "")];
} else {
    out_address = [out_address, 80];
}

var server = http.createServer(function(in_request, in_response) {
    console.log("IN Method: " + JSON.stringify(in_request.method));
    console.log("IN Url: " + JSON.stringify(in_request.url));
    console.log("IN Headers: " + JSON.stringify(in_request.headers));

    in_request.headers["host"] = out_address[0];

    var options = {
        host: out_address[0],
        port: out_address[1],
        method: in_request.method,
        path: in_request.url,
        headers: in_request.headers,
        agent: false
    };

    var out_request = http.request(options, function(out_response) {
        console.log("OUT Url: " + JSON.stringify(in_request.url));
        console.log("OUT Headers: " + JSON.stringify(out_response.headers));
        console.log("OUT Status: " + out_response.statusCode);

        in_response.writeHead(out_response.statusCode, out_response.headers);

        out_response.on("data", function(chunk) {
            in_response.write(chunk);
        });

        out_response.on("end", function(chunk) {
            in_response.end(chunk);
        });
    });

    out_request.on("close", function(error) {
        console.log("OUT Close (" + in_request.url + "): " + JSON.stringify(error));
    });

    out_request.on("error", function(error) {
        console.log("OUT Error (" + in_request.url + "): " + JSON.stringify(error));
        in_response.end();
    });

    in_request.on("data", function(chunk) {
        console.log("IN Data: " + chunk);
        out_request.write(chunk);
    });

    in_request.on("end", function(chunk) {
        out_request.end(chunk);
    });
});

server.listen(in_address[1], in_address[0]);
