/*
* Helpers for various tasks
*
*/
// Dependencies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var queryString = require('querystring');
var path = require('path');
var fs = require('fs');

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

// Get the string content of a template
helpers.getTemplate = function(templateName, data, callback){
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data !== null ? data : {};
    if(templateName){
      var templatesDir = path.join(__dirname, '/../templates/');
      fs.readFile(templatesDir+templateName+'.html', 'utf8', function(err, str){
        if(!err && str && str.length > 0){
          // Do interpolation on the string
          var finalString = helpers.interpolate(str, data);
          callback(false, finalString);
        } else {
          callback('No template could be found');
        }
      });
    } else {
      callback(' A valid template name was not specified');
    }
};

// Add the universal header and footer to a string and pass the provided data object to the header and footer for interprolation
helpers.addUniversalTemplates = function(str, data, callback){
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  data = typeof(data) == 'object' && data !== null ? data : {};
  // Get the Header
  helpers.getTemplate('_header', data, function(err, headerString){
    if(!err && headerString){
      // Get the footer
      helpers.getTemplate('_footer', data, function(err, footerString){
        if(!err && footerString){
          // Add them all together
          var fullString = headerString + str + footerString;
          callback(false, fullString);
        } else{
          callback("Couldn't find the footer template");
        }
      })
    }else {
      callback('Couldn\'t find the header template');
    }
  })
}

// Take a given string and a data object and find/replace all the key within it
helpers.interpolate = function(str, data){
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  data = typeof(data) == 'object' && data !== null ? data : {};

  // Add the templateGlobals do the the dataobject, prepending their key name with "global"
  for(var keyName in config.templateGlobals){
    if(config.templateGlobals.hasOwnProperty(keyName)){
      data['global.'+keyName] = config.templateGlobals[keyName];
    }
  }

  // For each key in the data object, insert its value into the string into the corresponding placeholder
  for(var key in data){
    if(data.hasOwnProperty(key) && typeof(data[key]) == 'string'){
      var replace = data[key];
      var find = '{'+key+'}';
      str = str.replace(find, replace);
    }
  }
  return str;
};

// Get the contents of a static asset
helpers.getStaticAsset = function(fileName, callback){
  fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
}

// Export the module
module.exports = helpers;
