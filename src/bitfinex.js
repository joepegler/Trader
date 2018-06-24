module.exports = (function(){

    'use strict';

    const BFX = require('bitfinex-api-node');
    const { Order } = require('bitfinex-api-node/lib/models');
    const Promise = require('promise');
    const moment = require('moment');
    const _ = require('lodash');
    const config = require('./config');

    let ws, rest, db, logger; // APIs & DB

    function _getCandles(pair, timeframe, limit){
        logger.log('_getCandles');
        return new Promise((resolve, reject) => {
            rest.candles({ timeframe: timeframe, symbol: 't' + pair.toUpperCase(), section: 'hist', query: { limit: limit } }, (err, _candles) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(_candles.reverse());
            });
        })
    }

    function _getOrders(pair){
        logger.log('getOrders');
        return new Promise((resolve, reject) => {
            rest.activeOrders((err, orders) => {
                if (err) {
                    reject(err);
                    return;}
                orders = orders.map(order => {
                    return {
                        id: order[0],
                        pair: order[3].substring(1),
                        ts: moment(order[4]).format('YYYY-MM-DD HH:mm:ss.SSSSSS'),
                        amount: Math.abs(order[6]),
                        status: order[13],
                        side: parseFloat(order[6]) > 0 ? 'buy' : 'sell',
                    };
                });
                if (pair){
                    orders.filter(order => {return order.pair === pair});
                }
                resolve(orders);
            });
        })
    }

    function _getPositions(pair){
        logger.log('getPositions');
        return new Promise((resolve, reject) => {
            rest.positions((err, positions) => {
                if (err) {
                    reject(err);
                    return;
                }
                positions = positions.map(position => {
                    return {
                        pair: position[0].substring(1),
                        amount: position[2],
                        side: parseFloat(position[2]) > 0 ? 'buy' : 'sell',
                        base: position[3],
                        funding: position[4],
                        profit: position[6]
                    }
                });
                if (pair){
                    positions.filter(position => {return position.pair === pair});
                }
                resolve(positions);
            });
        })
    }

    function _getState(pair){
        logger.log('getState');
        return new Promise((resolve, reject) => {
            _getPositions(pair).then(positions => {
                _getOrders(pair).then(orders => {
                    resolve({
                        positions: positions,
                        orders: orders
                    });
                }).catch(reject);
            }).catch(reject);
        })
    }

    function _getBalance(symbol){
        logger.log('_getBalance');
        return new Promise((resolve, reject) => {
            rest.balances((err, balances) => {
                if (err) {
                    reject(err);
                    return;
                }
                let found = _.find(balances, {type: 'trading', currency: symbol || 'usd'});
                if (found){
                    resolve(found);
                }
                else {
                    reject();
                }
            });
        })
    }

    function _order(pair, amount, signalId){
        logger.log('order');
        return new Promise((resolve, reject) => {
            const o = new Order({
                cid: Date.now(),
                symbol: 't' + pair,
                amount: amount,
                type: Order.type.MARKET
            }, ws);
            o.registerListeners();
            o.on('close', () => {
                let order = o.serialize();
                let trade = {
                    id: order[0],
                    signal: signalId,
                    pair: order[3].substring(1),
                    ts: moment(order[2]).format('YYYY-MM-DD HH:mm:ss.SSSSSS'),
                    amount: Math.abs(order[7]),
                    side: parseFloat(order[6]) > 0 ? 'buy' : 'sell',
                };
                logger.log('Order success: ' + JSON.stringify(trade, null, 2));
                db.saveTrade(trade).then(resolve).catch(reject);
            });
            o.submit().catch(reject);
        })
    }

    function _init(configKeys, _logger, _db){
        return new Promise((resolve, reject) => {
            const bfx = new BFX({
                apiKey: configKeys.websocket.key,
                apiSecret: configKeys.websocket.secret,
                ws: {
                    autoReconnect: true,
                    seqAudit: true,
                    packetWDDelay: 10 * 1000
                }
            });
            const bfx2 = new BFX({
                apiKey: configKeys.rest.key,
                apiSecret: configKeys.rest.secret,
            });
            db = _db;
            logger = _logger;
            ws = bfx.ws();
            rest = bfx2.rest();
            ws.on('error', logger.log);
            ws.on('open', ws.auth.bind(ws));
            // ws.once('auth', resolve);
            resolve();
            ws.open();
        });

    }

    function _matchPositionsWithSignals(){
        return new Promise((resolve, reject) => {
            logger.log('matchPositionsWithSignals');
            let signalsAndState = [db.getUntradedSignals(), _getState()];
            Promise.all(signalsAndState).then(results => {
                let signals = results[0];
                let positions = results[1].positions;
                let openOrders = results[1].orders;
                let orders = signals.map(signal => {
                    let matchingPosition = _.find(positions, {pair: signal.pair});
                    if (matchingPosition) {
                        let remainingAmount = parseFloat(signal.amount) - parseFloat(matchingPosition.amount);
                        if (remainingAmount !== 0) {
                            logger.log('matchPositionsWithSignals success: ' + JSON.stringify(signal));
                            return _order(signal.pair, remainingAmount.toString(), signal.id);
                        }
                        else {
                            return db.markSignalDone(signal.id);
                        }
                    }
                    else {
                        logger.log('matchPositionsWithSignals success: ' + JSON.stringify(signal));
                        return _order(signal.pair, parseFloat(signal.amount), signal.id);
                    }
                });
                Promise.all(orders).then(resolve).catch(reject);
            }).catch(reject);
        })
    }

    return {
        order: _order,
        getState: _getState,
        getPositions: _getPositions,
        getOrders: _getOrders,
        getCandles: _getCandles,
        getBalance: _getBalance,
        matchPositionsWithSignals: _matchPositionsWithSignals,
        init: _init
    }

})();
