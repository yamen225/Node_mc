/*
 * Server related tasks
 *
*/

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');

//Instantiate the server moduile object
var server = {}

// Instantiate the HTTP server
server.httpServer = http.createServer(function(req, res){
    server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
    'key' : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res){
    server.unifiedServer(req, res);
});

// All the server logic for both http and https servers
server.unifiedServer = function(req, res){
    // Get the URL and parse it
    var parsedUrl = url.parse(req.url, true);

    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    var queryStringObject = parsedUrl.query;

    // Get the HTTP Method
    var method = req.method.toLowerCase();

    // Get the Headers as an Object
    var headers = req.headers;

    // get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data', function(data){
        buffer += decoder.write(data);
    });
    req.on('end', function(){
        buffer += decoder.end();

        // Choose the handler this request should go to. if one is not found use the not found handler
        var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        //construct the data object to send to the handlers
        var data = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : helpers.parseJsonToObject(buffer),
        }
        // Route the request to the handler in the router
        chosenHandler(data, function(statusCode, payload){
            // Use the status code called back by the handler or default 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Use the payload called back by the handler, or default empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // Convert the payload to a string
            var payloadString = JSON.stringify(payload);

            //return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // Log the request path
            console.log('Returning this response: ', statusCode, payloadString);

        });

    });
};

// Define a request router
server.router = {
    'ping' : handlers.ping,
    'users' : handlers.users,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
};

// Init script
server.init = function(){
    // Start the http server
    server.httpServer.listen(config.httpPort, function(){
        console.log("The server is listening on port "+config.httpPort+" now");
    });

    // Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, function(){
        console.log("The server is listening on port "+config.httpsPort+" now");
    });

}


// Export the module
module.exports = server;
