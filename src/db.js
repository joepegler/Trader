module.exports = (function () {
    "use strict";

    const MongoClient = require('mongodb').MongoClient;
    const Promise = require('promise');
    const logger = require('./logger');
    const test = require('assert');

    let url, dbName;
    // Connect using MongoClien
    function init(url, dbName){
        return new Promise((resolve, reject) => {
            MongoClient.connect(url, function (err, client) {
                if ( err ) { reject( err.message ); return; }
                // Use the admin database for the operation
                const adminDb = client.db(dbName).admin();
                // List all the available databases
                adminDb.listDatabases(function (err, dbs) {
                    if ( err ) reject( err.message );
                    test.equal(null, err);
                    test.ok(dbs.databases.length > 0);
                    client.close();
                });
            });
        });
    }

    function addTrade(){
        const col = client.db(dbName).collection('trades');
    }

    return {
        init: init,
        addTrade: addTrade
    };

})();
