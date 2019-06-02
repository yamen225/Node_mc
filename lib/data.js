/*
 * Library for storing and editing data
 *
 */

// Dependencies
var fs = require('fs');
var path = require('path');

// Container for the module (to be exported)
var lib = {}

// Base directory for the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = function(dir, file, data, callback){
    // Open the file for writing
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function(
            err, fileDescriptor){
            if(!err && fileDescriptor){
                //convert data to string
                var stringData = JSON.stringify(data);

                //write to file and close it
                fs.writeFile(fileDescriptor, stringData, function(err){
                    if(!err){
                        callback(false)
                    }else {
                        callback('Error writing to new file');
                    }
                });
            }else{
                callback('Couldnot create new file, it may already exist')
            }
        });
};


// Export the module
module.exports = lib
