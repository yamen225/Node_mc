/*
 * Worker related tasks
 *
*/

// Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url')

// Instantiate the worker object
var workers = {};

//Lookup all the checks, get their data, send to a validator
workers.AllChecks = function(){
    // Get all the checks
    _data.list('checks', function(err, checks){
        if(!err && checks && checks.length > 0){
            checks.forEach(function(check){
                // Read in the check data
                _data.read('checks', check, function(err, originalCheckData){
                    if (!err && originalCheckData) {
                        // Pass the data to the check validator, and let that function continue or log errors as needed
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log("Error: reading one of the checks data");
                    }
                });
            });
        } else{
            console.log("Error: could not find any checks to process");
        }
    })
};

// Sanity checking the check data
workers.validateCheckData = function(originalCheckData){
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.length == 20 ? originalCheckData.id : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.length == 10 ? originalCheckData.userPhone : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.length > 0 ? originalCheckData.url : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 == 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not e set (if the workers have never seen this check before)
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
    // if all the checks pass, pass the data along to the next step in the process
    if(originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds){
        workers.performCheck(originalCheckData);
    }else {
        console.log("Error: One of the checks is not properly formatted. Skipping it.");
    }
};

// Perform the check, send the originalCheckData and the outcome of the check process to the next step in the process
workers.performCheck = function(originalCheckData){
    // Prepare the initial check outcome
    var checkOutcome = {
        'error': false,
        'responseCode': false,
    };

    // Mark that the outcome has not been sent yet
    var outcomeSent = false;

    // Parse the hostname and the path out of the original check data
    var parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
    var hostname = parsedUrl.hostname;
    var path = parsedUrl.path; // Using path not pathname coz we want the querystring.

    // construct the request
    var requestDetails = {
        'protocol': originalCheckData.protocol+':',
        'hostname': hostname,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000,
    };

    // Instanciate the request object (using either http or https module)
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails, function(res){
        // Grab the status of the sent request
        var status = res.statusCode

        // Update the check outcome and pass the data along
        checkOutcome.responseCode = status;
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the error event so it doesn't get throwing
    req.on('error', function(e){
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': e
        };
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }

    });

    // Bind to the error event so it doesn't get throwing
    req.on('timeout', function(e){
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': timeout
        };
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }

    });

    // End the request
    req.end();
};

// Process the checkoutcome and update the check data as needed and trigger an alert to user if needed
// Special logic for acomidating a check that has never been tested before(we don't want to alert on that one)
workers.processCheckOutcome = function(originalCheckData, checkOutcome){
    // Decide if the check is considered up or down ion this current state
    var state = !checkOutcome.error &&  checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    // Decide if an alert is warranted
    var alertWararanted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Update the check data
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    //Save the changes
    _data.update('checks', newCheckData.id, newCheckData, function(err){
        if (!err) {
            if (alertWararanted){
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('Check outcome has not changed');
            }
        } else {
            console.log("error trying to save updates to one of the checks");
        }
    });
};

// Alert the user as to a change in their chack status
workers.alertUserToStatusChange = function(newCheckData){
    var msg = 'Alert: your check for '+ newCheckData.method.toUpperCase()+ ' '+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err){
        if (!err) {
            console.log('Success, user was alerted to a status change in their check via sms.', msg);
        } else {
            console.log('Error: could not send sms alert to user whop had state change in their check');
        }
    });
};

//Timer to execute the worker-process once pre minute
workers.loop = function(){
    setInterval(function(){
        workers.AllChecks();
    }, 1000 * 60);
};


// Init script
workers.init = function(){
    // Execute all the checks imediately
    workers.AllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();
}


//Export the module
module.exports = workers;
