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
        return new Promise((resolve, reject) => {
            return signaller.getSignal(pair, '1h', 55).then(signal => {
                tradeStrategy(signal, pair).then(resolve).catch(reject);
            }).catch(reject);
        });
    }

    function tradeStrategy(signal, pair){

        // signal = {long, short, closeLong, closeShort}

        return new Promise((resolve, reject) => {

            Promise.all([exchange.getBalance('btc'), exchange.getState(pair), db.getUntradedSignals(pair), db.getOpenPositions(pair)]).then(results => {

                let balance = results[0];
                let orders = results[1].orders;
                let positions = results[1].positions;
                let untradedSignals = results[2];
                let idle = !orders.length && !positions.length && !untradedSignals.length;
                let balanceUsd = parseFloat(balance.amount);
                let openPositionsFromDb = results[3];
                let dbPosition = openPositionsFromDb[0];
                let exchangePosition = positions[0];
                let firstInstallment = Math.round(balanceUsd / strategyOptions.installments);

                firstInstallment = '0.002'; // Testing

                logger.log('signal: ');
                logger.log(signal);
                logger.log('balance: ');
                logger.log(balance);
                logger.log('orders: ');
                logger.log(orders);
                logger.log('positions: ');
                logger.log(positions);
                logger.log('untradedSignals: ');
                logger.log(untradedSignals);
                logger.log('balanceUsd: ');
                logger.log(balanceUsd);
                logger.log('firstInstallment: ');
                logger.log(firstInstallment);

                // If there are no open positions
                if ( idle ){
                    if (signal.short){
                        db.savePosition(strategyOptions.installments, firstInstallment, pair, 'sell').then(signal => {
                            exchange.matchPositionsWithSignals().then(resolve).catch(reject);
                        }).catch(reject);
                    }
                    else if(signal.long){
                        db.savePosition(strategyOptions.installments, firstInstallment, pair, 'buy').then(signal => {
                            exchange.matchPositionsWithSignals().then(resolve).catch(reject);
                        }).catch(reject);
                    }
                }
                else {

                    let dbAndExchangePostionsInSync = openPositionsFromDb.length === 1 && positions.length === 1 && exchangePosition.pair === dbPosition.pair;

                    // There are open positions, either add to them or close them where necessary.
                    if ( dbAndExchangePostionsInSync ) {

                        db.getSignalsByPositionId(dbPosition.id).then(dbSignals => {

                            let addToLong = signal.long && exchangePosition.side === 'buy' && dbSignals.length !== dbPosition.installments;
                            let addToShort = signal.short && exchangePosition.side === 'sell' && dbSignals.length !== dbPosition.installments;
                            let closeLong = signal.closeLong && exchangePosition.side === 'buy';
                            let closeShort = signal.closeShort && exchangePosition.side === 'sell';

                            if ( addToLong ){
                                // Check that the installment limit has not been reached (dbSignals !== )
                                // Add the next installment with a new signal
                            }
                            else if ( addToShort ){
                                // Add the next installment with a new signal
                            }
                            else if ( closeLong ){
                                // Close open position with a new signal && amount === 0
                                // Mark the position as done
                            }
                            else if ( closeShort ) {

                            }
                        }).catch(reject);
                    }
                    else {
                        reject('Cannot open multiple open positions');
                    }
                }
            }).catch(reject);
        })
    }

    return {
        init: init
    };

})();