/*
* Helpers for various tasks
*
*/
// Dependencies
var crypto = require('crypto');
var config = require('./config');

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





// Export the module
module.exports = helpers;
