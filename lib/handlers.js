/*
* Request Handlers
*
*/

// Dependencies
var _data = require('./data')
var helpers = require('./helpers')

// Define the handlers
var handlers = {};

// users handlers
handlers.users = function(data,callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

//container for the users submethods
handlers._users = {};

// Users - Post
// Required data: firstname, lastname, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(data, callback){
    // Check that all required fields are filled out
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;

    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;

    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? data.payload.tosAgreement : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user doesn't already exist
        _data.read('users', phone, function(err, data){
            if(err){
                // Hash the password
                var hashedPassword = helpers.hash(password);

                if (hashedPassword) {
                    // Create the user object
                    var userObject = {
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    };

                    // Store the user
                    _data.create('users', phone, userObject, function(err){
                        if (!err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {
                                'Error' : 'Could not create the new user'
                            });
                        }
                    });
                } else {
                    callback(500, {
                        'Error' : 'Could not hash the user\'s password'
                    });
                }
            }else {
                //User with that phone number already exists
                callback(400, {'Error' : 'A user with that phone number already Exists'});
            }
        });
    } else {
        callback(400, {'Error' : 'Missing required fields'});
    }

};

// Users - Get
// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback){
    //check that the phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        //Get the token from the Headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        //Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                //Look up the user
                _data.read('users', phone, function(err, data){
                    if(!err && data){
                        // Remove the hashedd password from the user object before returning it to the requestor
                        delete data.hashedPassword;
                        callback(200, data);
                    }else{
                        callback(404);
                    }
                });
            }else {
                callback(403, {'Error': 'Missing required token in header or token is invalid'});
            }
        });
    }else {
        callback(400,{'Error': 'Missing required field'});
    }
};

// Users - Put
// Required Data: phone
// Optional Data: firstName, lastName, password(at least one must be specified)
handlers._users.put = function(data, callback){
    // check for the require field
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    //check for the optional fields
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;

    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;

    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    // Eror if the phone is invalid
    if(phone){
        // Error if nothing sent to update
        if (firstName || lastName || password){

            //Get the token from the Headers
            var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            handlers._tokens.verifyToken(token, phone,function(tokenIsValid){
                if(tokenIsValid){
                    //Lookup the user
                    _data.read('users', phone, function(err, userData){
                        if(!err && userData){
                            //update the fields necessary
                            if(firstName){
                                userData.firstName = firstName;
                            }
                            if(lastName){
                                userData.lastName = lastName;
                            }
                            if(password){
                                userData.hashedPassword = helpers.hash(password);
                            }

                            // store the new updates
                            _data.update('users', phone, userData, function(err){
                                if(!err){
                                    callback(200);
                                }else{
                                    console.log(err);
                                    callback(500, {'Error': 'could not update the user'});
                                }
                            });
                        }else {
                            callback(400, {'Error': 'The specified user does not exist'});
                        }
                    });
                }else{
                    callback(403, {'Error': 'Missing required token in header or token is invalid'});
                }
            })

        }else {
            callback(400, {
                'Error': 'Missing fields to update'
            });
        }
    } else {
        callback(400, {
            'Error': 'Missing required field'
        });
    }
};

// Users - Delete
// Required Data: phone
// TODO: Cleanup (delete) any other data files associated with this user
handlers._users.delete = function(data, callback){
 // check that phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
         handlers._tokens.verifyToken(token, phone,function(tokenIsValid){
             if(tokenIsValid){
                 //Look up the user
                 _data.read('users', phone, function(err, data){
                     if(!err && data){
                         _data.delete('users', phone, function(err){
                             if(!err){
                                 callback(200)
                             }else{
                                 callback(500,{'Error': 'could not delete the specified user'})
                             }
                         });
                     }else{
                         callback(400, {'Error': 'Could not find the specified user'});
                     }
                 });
             }else{
                 callback(403, {'Error': 'Missing required token in header or token is invalid'});
             }
         });
    }else {
     callback(400,{'Error': 'Missing required field'});
    }
};

// Tokens handlers
handlers.tokens = function(data,callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

//Container for all the tokens methods
handlers._tokens = {};

// Token-post
// Required Data: phone, password
// optional data: none
handlers._tokens.post = function(data, callback){

    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone && password){
        // Lookup the user who matches that phone number
        _data.read('users', phone, function(err, userData){
            if(!err, userData){
                // Hash the sent password, and compare it to the password stored in the user object
                var hashedPassword = helpers.hash(password);
                if(hashedPassword == userData.hashedPassword){
                    // if valid create a new token with a random name, set expiration date 1 hour in the future
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenObject = {
                        'phone' : phone,
                        'id' : tokenId,
                        'expires' : expires
                    };
                    _data.create('tokens', tokenId, tokenObject, function(err){
                        if(!err){
                            callback(200, tokenObject);
                        }else {
                            callback(500, {'Error' : 'could not create the new token'});
                        }
                    });
                }else{
                    callback(400, {'Error': 'password did not match the specified user\'s stored password'});
                }
            }else{
                callback(400, {'Error': 'could not find specified user'})
            }
        });

    }else{
        callback(400, {'Error': 'Missing required fields'});
    }
};

// Token-get
// Required Data: id
// Optional data: none
handlers._tokens.get = function(data, callback){
    // Check the id was sent is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        //Look up the user
        _data.read('tokens', id, function(err, tokenData){
            if(!err && tokenData){
                callback(200, tokenData);
            }else{
                callback(404);
            }
        });
    }else {
        callback(400,{'Error': 'Missing required field'});
    }
};

// Token-put
// Required Fields: id, extend
// optional data: none
handlers._tokens.put = function(data, callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? data.payload.extend : false;

    console.log(id, extend);

    if(id && extend){
        _data.read('tokens', id, function(err, tokenData){
            if(!err, tokenData){
                // check to make sure that the token is already expired
                if(tokenData.expires > Date.now()){
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    //Store the new updates
                    _data.update('tokens', id, tokenData, function(err){
                        if(!err){
                            callback(200)
                        }else {
                            callback(500, {'Error': 'Could not update the token expiration'});
                        }
                    });
                } else {
                    callback(400, {'Error' : 'The token has already expired and cannot be extended'});
                }
            } else {
                callback(400, {'Error' : 'Specified token does not exist'});
            }
        });
    }else {
        callback(400,{'Error': 'Missing required field(s) or field(s) are invalid'});
    }

};

// Token-delete
// Required data: id
// optional data: none
handlers._tokens.delete = function(data, callback){
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        //Look up the user
        _data.read('tokens', id, function(err, data){
            if(!err && data){
                _data.delete('tokens', id, function(err){
                    if(!err){
                        callback(200)
                    }else{
                        callback(500,{'Error': 'could not delete the specified token'})
                    }
                })
            }else{
                callback(400, {'Error': 'Could not find the specified token'});
            }
        });
    }else {
        callback(400,{'Error': 'Missing required field'});
    }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function (id, phone, callback){
    // Lookup the token
    _data.read('tokens', id, function(err, tokenData){
        if(!err && tokenData){
            // Check that the token is for the given user and has not expired
            if(tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true);
            }else{
                callback(false);
            }

        }else{
            callback(false);
        }
    })
}

//ping handler
handlers.ping = function(data, callback){
    callback(200);
};

// Not found handler
handlers.notFound = function(data, callback){
    callback(404);
};


// Export the module
module.exports = handlers;
