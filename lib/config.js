/*
* Create and export configuration variables
*
*/

// Container for all the environments
var environments = {};

// Staging (default) environment
environments.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName' : 'staging',
    'hashingSecret' : 'thisIsASecret',
    'maxChecks' : 5,
    'twilio' : {
        'accountSid' : 'ACe7351861ffe838b9b44dacdef54fd274',
        'authToken' : 'a5857459433b8878dfc25bee348cdb46',
        'fromPhone' : '+18577632251'
    },
    'templateGlobals' : {
      'appName' : 'UpTimeChecker',
      'companyName' : 'NotARealCompany, Inc',
      'yearCreated' : '2019',
      'baseUrl' : 'http://localhost:3000/'
    }
};


// Production environment
environments.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production',
    'hashingSecret' : 'thisIsAlsoASecret',
    'maxChecks' : 5,
    'twilio' : {
        'accountSid': '',
        'authToken': '',
        'fromPhone': ''
    },
    'templateGlobals' : {
      'appName' : 'UpTimeChecker',
      'companyName' : 'NotARealCompany, Inc',
      'yearCreated' : '2019',
      'baseUrl' : 'http://localhost:5000/'
    }
};

// Determine which env was passed as a cLi argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not, default to Staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
