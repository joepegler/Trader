module.exports = (function() {

    'use strict';

    let db, logger, ex;

    return {
        init: (_db, _logger, _ex) => {
            db = _db;
            logger = _logger;
            ex = _ex;
        },
        getDbState: async function(){
            return new Promise((resolve, reject) => {
                Promise.all([db.getOpenPositions(), db.getOrders()]).then(results => resolve({positions: results[0], orders: results[1]})).catch(reject);
            });
        },
        getExState: async function(){
            return ex.getState();
        }
    };

});