/*
* Helpers for various tasks
*
*/
// Dependencies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var queryString = require('querystring');

// Container for the helpers
var helpers = {};


// Create a SHA256 hash
helpers.hash = function(str){
    if(typeof(str) == 'string' && str.length > 0){
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
}

// Parse a Json string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str){
    try{
        var obj = JSON.parse(str);
        return obj;
    }catch(e){
        return {};
    }
};

// Create a string of random alphanumeric chars of a given length
helpers.createRandomString = function(strLength){
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if(strLength){
        // Define all the possible chars the could go into the string
        var possibleChars = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Start the final string
        var str = '';
        for (var i = 0; i < strLength; i++) {
            // Get a random chars from possible chars
            var randomChar = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
            // Append this char to the final string
            str += randomChar;
        }
        // Return the final string
        return str;

    }else {
        return false
    }
}

// Send an sms message via twilio
helpers.sendTwilioSms = function(phone, msg, callback){
    // Validate the paramaters
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim.length <= 1600 ? msg.trim() : false;

    if(phone && msg){
        // Configure the request payload
        var payload = {
            'From' : config.twilio.fromPhone,
            'To' : '+20'+phone,
            'Body' : msg
        };

        // Stringify the payload
        var stringifyPayload = queryString.stringify(payload);

        // Configure the requewst details
        var requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length' : Buffer.byteLength(stringifyPayload)
            }
        };

        // Instantiate the request object

        var req = https.request(requestDetails, function(res){
            // Grab the status of the sent request
            var status = res.statusCode;
            // Callback successfuly if the request went through
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Status code returned was' + status);
            }
        });

        // Bind to an error event so it doesn't get thrown
        req.on('error', function(e){
            callback(e);
        });

        // Add the payload to the request
        req.write(stringifyPayload);

        //End the request
        req.end();

    }else {
        callback('Given paramaters were missing or invalid')
    }
}



// Export the module
module.exports = helpers;
