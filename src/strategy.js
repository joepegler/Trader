module.exports = (function() {

    "use strict";

    let exchange, logger, strategyOptions, signaller, db, ticker = 0;

    function init(_exchange, _logger, _strategyOptions, _signaller, _db){
        return new Promise((resolve) => {
            db = _db;
            signaller = _signaller;
            exchange = _exchange;
            logger = _logger;
            strategyOptions = _strategyOptions;
            setInterval(execute, strategyOptions.timeframe.ms);
            execute();
            resolve('Initiated strategy');
        });
    }

    function execute(){
        tradeStrategy('BTCUSD').then(res => { logger.log(res, null, true); }).catch(err => { logger.error(err); });
    }

    function tradeStrategy(pair){
        ticker++;
        return new Promise((resolve, reject) => {
            exchange.getBalance(pair).then(balance => {
                exchange.getState(pair).then(state => {
                    let orders = state.orders;
                    let positions = state.positions;
                    db.getIncompleteOrders(pair).then(incompleteOrders => {
                        db.getOpenPositions(pair).then(openPositionsFromDb => {
                            let dbPosition = openPositionsFromDb[0];
                            signaller.getSignal(pair, strategyOptions.timeframe.duration, strategyOptions.maxLookback).then(signal => {
                                let exchangePosition = positions[0];
                                let size = Math.round((balance / strategyOptions.installments) * 100) / 100; // For testing
                                let idle = !orders.length && !positions.length && !incompleteOrders.length;
                                let activeAndInSync = (openPositionsFromDb && openPositionsFromDb.length === 1) && (positions && positions.length === 1) && (exchangePosition && dbPosition && exchangePosition.pair === dbPosition.pair);
                                logger.log('['+ticker+']\n\n' + JSON.stringify(signal, null, 2), null, true);
                                if ( idle ){
                                    if (signal.short || signal.long){
                                        logger.log('Going ' + (signal.long ? 'long' : 'short') + ' ' + size + ' ' + pair);
                                        db.savePosition(strategyOptions.installments, size, pair, (signal.long ? 'buy': 'sell')).then(() => {
                                            exchange.placeTradesWithDbOrders().then(resolve).catch(reject);
                                            ticker = 0;
                                        }).catch(reject);
                                    }
                                }
                                else if (activeAndInSync){
                                    db.getOrdersByPositionId(dbPosition.id).then(dbOrders => {
                                        // let timeToAdd = !(ticker % strategyOptions.topupOffset);
                                        let timeToAdd = ticker === strategyOptions.topupOffset;
                                        let inProfit = exchangePosition && parseFloat(exchangePosition.profit) > 0;
                                        let addToLong = signal.long && exchangePosition.side === 'buy' && dbOrders.length !== parseInt(dbPosition.installments) && timeToAdd && inProfit && signal.addToLong;
                                        let addToShort = signal.short && exchangePosition.side === 'sell' && dbOrders.length !== parseInt(dbPosition.installments) && timeToAdd && inProfit && signal.addToLong;
                                        let closeLong = signal.closeLong && exchangePosition.side === 'buy';
                                        let closeShort = signal.closeShort && exchangePosition.side === 'sell';
                                        if (addToLong || addToShort) {
                                            let index = dbOrders.length;
                                            let fraction = (index + 1) / strategyOptions.installments;
                                            let lastIndex = fraction === 1;
                                            let amount = (lastIndex ? balance : parseFloat(dbPosition.size) * (index + 1)) * (dbPosition.side === 'buy' ? 1 : -1);
                                            logger.log('Adding ' + dbPosition.size + ' to ' + pair + ' position, total: ' + amount, null, true);
                                            db.saveOrder(amount, pair, dbPosition.id, dbPosition.side).then(() => {
                                                exchange.placeTradesWithDbOrders().then(resolve('Added ' + size + ' to ' + pair + ' ' + (addToLong ? 'long' : 'short') + ' for a total of ' + amount)).catch(reject);
                                                ticker = 0;
                                            }).catch(reject);
                                        }
                                        else if (closeLong || closeShort) {
                                            db.saveOrder('0.0', pair, dbPosition.id, 'close').then(() => {
                                                exchange.placeTradesWithDbOrders().then(() => {
                                                    db.markPositionDone(dbPosition.id, exchangePosition.profit).then(resolve('Closing ' + (exchangePosition.side === 'buy' ? 'long' : 'short') + ' for a ' + (exchangePosition.profit > 0 ? 'profit' : 'loss') + ' of ' + exchangePosition.profit)).catch(reject);
                                                    ticker = 0;
                                                }).catch(reject);
                                            }).catch(reject);
                                        }
                                    }).catch(reject);
                                }
                            }).catch(reject);
                        }).catch(reject);
                    }).catch(reject);
                }).catch(reject);
            }).catch(reject);
        })
    }

    return {
        init: init
    };

})();