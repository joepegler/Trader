module.exports = (function() {

    "use strict";

    const _ = require('lodash');

    let exchange, logger, strategyOptions, signaller, db, ticker = 0;

    function init(_exchange, _logger, _strategyOptions, _signaller, _db){
        return new Promise((resolve, reject) => {
            db = _db;
            signaller = _signaller;
            exchange = _exchange;
            logger = _logger;
            strategyOptions = _strategyOptions;
            setInterval(execute, 1000 * 60 * 60); // Every hour
            resolve('initiated strategy');
        });
    }

    function execute(){
        tradeStrategy('BTCUSD').then(res => { logger.log(res, null, true); }).catch(err => { logger.error(err); });
    }

    function tradeStrategy(pair){

        ticker++;

        return new Promise((resolve, reject) => {

            let promises = [
                exchange.getBalance(pair),
                exchange.getState(pair),
                db.getincompleteOrders(pair),
                db.getOpenPositions(pair),
                signaller.getSignal(pair, strategyOptions.timeframe, strategyOptions.maxLookback)
            ];

            Promise.all(promises).then(results => {

                let balance = results[0];
                let orders = results[1].orders;
                let positions = results[1].positions;
                let incompleteOrders = results[2];
                let openPositionsFromDb = results[3];
                let signal = results[4];
                let dbPosition = openPositionsFromDb[0];
                let exchangePosition = positions[0];
                let size = Math.round((balance / strategyOptions.installments) * 100) / 100; size = '0.002'; // For testing
                let idle = !orders.length && !positions.length && !incompleteOrders.length;

                if ( idle ){
                    if (signal.short){
                        db.savePosition(strategyOptions.installments, size, pair, 'sell').then(order => {
                            exchange.placeTradesWithDbOrders().then(resolve).catch(reject);
                        }).catch(reject);
                    }
                    else if(signal.long){
                        db.savePosition(strategyOptions.installments, size, pair, 'buy').then(order => {
                            exchange.placeTradesWithDbOrders().then(resolve).catch(reject);
                        }).catch(reject);
                    }
                }
                else {

                    let inSync = openPositionsFromDb.length === 1 && positions.length === 1 && exchangePosition.pair === dbPosition.pair;

                    if ( inSync ) {

                        db.getOrdersByPositionId(dbPosition.id).then(dbOrders => {

                            let timeToAdd = !(strategyOptions.topupOffset % ticker);
                            let inProfit = parseFloat(exchangePosition.profit) > 0;
                            let addToLong = signal.long && exchangePosition.side === 'buy' && dbOrders.length !== dbPosition.installments && timeToAdd && inProfit;
                            let addToShort = signal.short && exchangePosition.side === 'sell' && dbOrders.length !== dbPosition.installments && timeToAdd && inProfit;
                            let closeLong = signal.closeLong && exchangePosition.side === 'buy';
                            let closeShort = signal.closeShort && exchangePosition.side === 'sell';

                            if ( addToLong ){

                                let index = dbOrders.length;
                                let amount = dbPosition.size * (index + 1);

                                db.saveOrder(amount, pair, dbPosition.id).then(order => {
                                    exchange.placeTradesWithDbOrders().then(resolve).catch(reject);
                                }).catch(reject);

                            }
                            else if ( addToShort ){

                                let index = dbOrders.length;
                                let amount = dbPosition.size * (index + 1) * -1;

                                db.saveOrder(amount, pair, dbPosition.id).then(order => {
                                    exchange.placeTradesWithDbOrders().then(resolve).catch(reject);
                                }).catch(reject);

                            }
                            else if ( closeLong ){

                                db.saveOrder('0.0', pair, dbPosition.id).then(order => {
                                    exchange.placeTradesWithDbOrders().then(() =>{
                                        db.markPositionDone(dbPosition.id).then(resolve).catch(reject);
                                    }).catch(reject);
                                }).catch(reject);

                            }
                            else if ( closeShort ) {

                                db.saveOrder('0.0', pair, dbPosition.id).then(order => {
                                    exchange.placeTradesWithDbOrders().then(() =>{
                                        db.markPositionDone(dbPosition.id).then(resolve).catch(reject);
                                    }).catch(reject);
                                }).catch(reject);

                            }
                            else {

                                logger.log('Still ' + (dbPosition.side === 'buy' ? 'long' : 'short') + ' ' + exchangePosition.amount + ' ' + exchangePosition.pair);

                            }
                        }).catch(reject);
                    }
                    else {
                        reject('Cannot process multiple open positions');
                    }
                }
            }).catch(reject);
        })
    }

    return {
        init: init
    };

})();