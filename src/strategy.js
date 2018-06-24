module.exports = (function() {

    "use strict";

    const _ = require('lodash');

    let exchange, logger, strategyOptions, signaller, db;

    let pair = 'BTCUSD';

    function init(_exchange, _logger, _strategyOptions, _signaller, _db){
        return new Promise((resolve, reject) => {
            db = _db;
            signaller = _signaller;
            exchange = _exchange;
            logger = _logger;
            strategyOptions = _strategyOptions;
            // setInterval(execute, 1000 * 60 * 60); // Every hour
            execute().then(resolve).catch(reject); //For testing
        });
    }

    function execute(){
        return signaller.getSignal(pair, '1h', 55).then(tradeStrategy);
    }

    function tradeStrategy(signal){

        return new Promise((resolve, reject) => {
            Promise.all([exchange.getBalance(pair), exchange.getState(pair), db.getUntradedSignals()]).then(results => {
                let balance = results[0];
                let orders = results[1].orders;
                let positions = results[1].positions;
                let untradedSignals = _.find(results[2], {pair: pair});

                let idle = !orders.length && !positions.length && !untradedSignals;

                logger.log('signal: ');
                logger.log(signal);
                logger.log('balance: ');
                logger.log(balance);
                logger.log('orders: ');
                logger.log(orders);
                logger.log('positions: ');
                logger.log(positions);

                if ( idle ){

                    if (signal.long){
                        db.saveSignal('.002', 'BTCUSD')
                            .then()
                    }
                    else if (signal.short){
                        db.saveSignal('-.002', 'BTCUSD')
                            .then()
                    }

                    // insert the first signal into db and match trade with signal
                    // if successful then add a position to the databases with the pyramiding and topup index(1) and the initial amount.
                    // Update the signal table entry with the position_id

                }
                else {
                    // get the current open position from the db. Check how many corresponding signals there have been
                    // if index is less than pyramiding then add to the position.
                    // insert signal into db and match trade with signal
                    // if successful then
                }

                resolve(':)');

            }).catch(reject);
        })

    }

    return {
        init: init
    };

})();