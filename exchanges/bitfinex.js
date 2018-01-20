module.exports = (function () {

    "use strict";

    const Promise = require('promise'),
        _ = require('lodash'),
        BFX = require('bitfinex-api-node');

    const configKeys = require('./config');

    const bitfinexRest = new BFX(configKeys.rest.key, configKeys.rest.secret, {version: 1, transform: true}).rest;
    const bitfinexWebsocket = new BFX(configKeys.websocket.key, configKeys.websocket.secret, { version: 2, transform: true }).ws;
    const logger = require('../utils/logger');

    let usdPrices = {}, prices = {
        // BTCUSD: {
        // 		exchange: 'bitfinex',
        // 		pair: 'BTCUSD',
        // 		ask: .041,
        // 		bid: .039,
        // 		mid: .040
        // }
    };

    let exchangePairNames = {
        ETHBTC: 'ETHBTC',
        BTCUSD: 'BTCUSD',
        LTCBTC: 'LTCBTC',
        XRPBTC: 'XRPBTC',
        XMRBTC: 'XMRBTC',
        DSHBTC: 'DSHBTC'
    };

    let _getBalance = function () {

        /*
        *
        * Returns a 'balance' object of the format:
        *
        * args: (none)
        *
        * returns:
        * {
        *       BTCUSD: {
        *           balance :   192.338,
        *           tradeable : 480.845
        *       }
        * }
        *
        * */

        return new Promise((resolve, reject) => {

            // Get margin data of the account
            bitfinexRest.margin_infos((err, data) => {

                if (!err) {

                    let balance = {};

                    logger.log(data);

                    _.each(exchangePairNames, function (exchangeCoinName, coinName) {

                        let usdPair = coinName.slice(0, -3) + 'USD';
                        balance[coinName] = {
                            balance: parseFloat(data[0].margin_balance / usdPrices[usdPair].ask),
                            tradeable: parseFloat(_.find(data[0].margin_limits, {on_pair: exchangeCoinName}).tradable_balance / usdPrices[usdPair].ask)
                        }
                    });
                    // logger.log('getBalance success: ' + JSON.stringify(prices, null, 2));
                    resolve(balance);
                }
                else {
                    // Reject the promise
                    reject(err);
                }
            });
        });
    };

    let _getActiveOrders = function () {

        /*
        * Gets all active orders
        *
        * args: (none)
        *
        * returns:
        *   [
        *       {
        *           "id":5243424763,
        *           "pair":"ETHBTC",
        *           "price": 0.043615,
        *           "side":"buy"
        *       }, ...
        *   ]
        *
        * */

        logger.log('getActiveOrders');

        return new Promise((resolve, reject) => {

            bitfinexRest.active_orders(function (err, activeOrderResponse) {

                if (!err) {

                    /*
                    *
                    * [
                    *       {
                    *           "id":5243424763,
                    *           "cid":59796173969,
                    *           "cid_date":"2017-11-18",
                    *           "gid":null,
                    *           "symbol":"ethbtc",
                    *           "exchange":null,
                    *           "price":"0.043615",
                    *           "avg_execution_price":"0.0",
                    *           "side":"buy",
                    *           "type":"limit",
                    *           "timestamp":"1511022996.0",
                    *           "is_live":true,
                    *           "is_cancelled":false,
                    *           "is_hidden":false,
                    *           "oco_order":null,
                    *           "was_forced":false,
                    *           "original_amount":"0.25",
                    *           "remaining_amount":"0.25",
                    *           "executed_amount":"0.0",
                    *           "src":"web"
                    *       }
                    * ]
                    *
                    * */

                    let activeOrders = [];
                    const invertedMap = _.invert(exchangePairNames);

                    activeOrderResponse.forEach((activeOrder) => {
                        activeOrders.push({
                            id: activeOrder.id.toString(),
                            pair: invertedMap[activeOrder.symbol.toUpperCase()],
                            price: parseFloat(activeOrder.price),
                            side: activeOrder.side
                        })
                    });

                    // logger.log('getActiveOrders success: ' + JSON.stringify(activeOrders, null, 2));
                    resolve(activeOrders);
                }
                else {
                    reject(err);
                }
            });
        });
    };

    let _getActivePositions = function () {

        /*
        * Gets all active positions
        *
        * args: (none)
        *
        * returns:
        *
        * {
        *   id: 38168717,
        *   pair: 'ETHBTC',
        *   base: 0.043646,
        *   amount: .25,
        *   profit: -0.000030805,
        *   side: 'buy'
        * }
        *
        * */

        logger.log('getActivePositions');

        return new Promise((resolve, reject) => {

            bitfinexRest.active_positions(function (err, activePositionResponse) {

                if (!err) {
                    /*
                    *
                    * [
                    *   {
                    *       id: 38168717,
                    *       symbol: 'ethbtc',
                    *       status: 'ACTIVE',
                    *       base: '0.043646',
                    *       amount: '0.25',
                    *       timestamp: '1511022525.0',
                    *       swap: '0.0',
                    *       pl: '-0.000030805'
                    *   }
                    * ]
                    *
                    * */

                    if (activePositionResponse.length) {

                        let activePositionArr = [];
                        const invertedMap = _.invert(exchangePairNames);

                        activePositionResponse.forEach((activePos, i) => {

                            // {
                            //     "id": 38613045,
                            //     "symbol": "btcusd",
                            //     "status": "ACTIVE",
                            //     "base": "11150.0",
                            //     "amount": "0.071",
                            //     "timestamp": "1512211440.0",
                            //     "swap": "-0.4426557",
                            //     "pl": "42.986382"
                            // }

                            let positionId = activePositionResponse[i].id.toString();
                            let positionPairName = invertedMap[activePositionResponse[i].symbol.toUpperCase()];
                            let positionAmount = parseFloat(activePositionResponse[i].amount);
                            let positionPrice = parseFloat(activePositionResponse[i].base);
                            let positionProfit = parseFloat(activePositionResponse[i].pl);

                            activePositionArr.push({
                                id: positionId,
                                pair: positionPairName,
                                base: positionPrice,
                                amount: positionAmount,
                                profit: positionProfit,
                                side: positionAmount > 0 ? 'buy' : 'sell'
                            });

                            // logger.log('getActivePositions success: ' + JSON.stringify(activePositionArr, null, 2));
                            resolve(activePositionArr);
                        });
                    }
                    else {

                        // There aren't any active positions
                        resolve([]);
                    }
                }
                else {
                    reject(err);
                }
            });
        });
    };

    let _getState = function () {

        /*
        * Gets state of the bot
        *
        * args: (none)
        *
        * returns:
        *
        *   state = {
        *       ETHBTC: {
        *           orders: [],
        *           positions: [],
        *           side: 'buy'
        *       }
        *   }
        *
        * */

        logger.log('getState');

        return new Promise((resolve, reject) => {

            _getBalance().then(balance => {

                _getActivePositions().then(activePositions => {

                    _getActiveOrders().then(activeOrders => {

                        let state = {};

                        activePositions.forEach(position => {

                            //  position = {
                            //      id: 38168717,
                            //      pair: 'ETHBTC',
                            //      base: 0.043646,
                            //      amount: .25,
                            //      profit: -0.000030805,
                            //      side: 'buy'
                            //  }

                            if (!state[position.pair]) {
                                state[position.pair] = {
                                    side: position.side,
                                    positions: [],
                                    orders: []
                                };
                            }

                            state[position.pair].positions.push(position);
                        });

                        activeOrders.forEach(order => {

                            //  order = {
                            //      "id":5243424763,
                            //      "pair":"ETHBTC",
                            //      "price": 0.043615,
                            //      "side":"buy"
                            //  }

                            if (!state[order.pair]) {
                                state[order.pair] = {
                                    side: order.side === 'buy' ? 'buy' : 'sell',
                                    positions: [],
                                    orders: []
                                };
                            }
                            state[order.pair].orders.push(order);
                        });

                        // If empty object then the state is idle.
                        resolve(state);

                    }).catch(reject);
                }).catch(reject);
            }).catch(reject);
        });
    };

    let _stateHasChanged = function( pair, stateTest ){

        /*
        * Checks to ensure that the state of the bot has changed. Retries with an interval
        *
        * args: ('ETHBTC', 'idle')
        *
        * returns:
        *
        * Boolean
        *
        * */

        // Retries every 10 seconds for up to a minute.
        let hardStop = 1000 * 60; // one minute
        let retry_interval = 1000 * 5; // 10 seconds

        logger.log('stateHasChanged');

        return new Promise((resolve, reject) => {

            let __stateHasChanged = function( pair, stateTest){

                _getState().then(state => {

                    // Check to see if the bot state matches the stateTest provided.
                    if ((state[pair] && state[pair].side === stateTest) || (!state[pair] && stateTest === 'idle')){

                        // logger.log('Successfully changed state to: ' + stateTest);
                        resolve( state );
                    }
                    else {

                        // If time still less than the hard stop
                        if ( hardStop > 0 ){

                            logger.log('State hasn\'t changed to ' + stateTest + '. Retrying in ' + (retry_interval / 1000) + ' seconds.');

                            // Try again
                            setTimeout(() => {

                                // recursive call
                                __stateHasChanged(pair, stateTest);

                                // countdown
                                hardStop -= retry_interval;

                            }, retry_interval)
                        }
                        else {
                            reject( 'Failed to change the state.' );
                        }
                    }
                })
            };

            __stateHasChanged(pair, stateTest);

        });
    };

    let _exit = function (pair) {

        /*
        *
        * Exits a position.
        *
        * args:
        *
        * state (string):
        *
        *  [active, idle]
        *
        * returns:
        *
        *  (none)
        *
        * */

        logger.log('exit');

        return new Promise((resolve, reject) => {

            _getState().then(state => {

                state = state[pair];

                if (state) {

                    // Cancel all active orders
                    let orders = state.orders.map(order => { return _cancelOrder(order.id); });

                    // Exit a position by placing a similarly sized order in opposite direction to current position.
                    let positions = state.positions.map(pos => { return _order(pair, pos.side === 'buy' ? 'sell' : 'buy', Math.abs(parseFloat(pos.amount)).toString()); });

                    let cancellations = positions.concat(orders);

                    // Once all orders and positions have been exited
                    Promise.all(cancellations).then(() => {

                        // Ensure that the state has changed to idle.
                        _stateHasChanged( pair, 'idle' ).then(resolve).catch(reject);

                    }).catch(reject);
                }
                else {

                    // Resolve because bot was already idle for that pair
                    resolve('No active positions for ' + pair);
                }
            })
        });
    };

    let _cancelOrder = function (orderId) {

        /*
        *
        * Closes an open order.
        *
        * args:
        *
        * orderId (int):
        *
        * returns:
        *
        *  (none)
        *
        * */

        logger.log('cancelOrder');

        return new Promise((resolve, reject) => {
            bitfinexRest.cancel_order(orderId.toString(), (err, res) => {
                if (!err) {
                    resolve(res);
                }
                else {
                    reject(err);
                }
            });
        });
    };

    let _init = function (pairs) {

        // Initiate the price ticker and retrieve the current account balance.
        logger.log('init');

        return new Promise((resolve, reject) => {

            // First close any open websocket
            // bitfinexWebsocket.close();

            // exchangePairNames needs to be filtered by the 'pairs' argument
            exchangePairNames = _.pickBy(exchangePairNames, function (coinVal, coinName) {
                return _.includes(pairs, coinName)
            });

            const invertedMap = _.invert(exchangePairNames);

            // When the websocket opens
            bitfinexWebsocket.on('open', () => {

                // Authenticate once the websocket has been opened.
                bitfinexWebsocket.auth();

            });

            // When the websocket errs
            bitfinexWebsocket.on('error', logger.error);

            bitfinexWebsocket.on('auth', () => {

                // Only resolve once price has been found.
                let foundPrice = false;

                // Loop the exchange coin names and subscribe to each of the pairs
                _.each(exchangePairNames, pair => {

                    bitfinexWebsocket.subscribeTicker('t' + pair);
                    pair.indexOf('USD') === -1 && bitfinexWebsocket.subscribeTicker('t' + pair.slice(0, -3) + 'USD'); // also subscribe to usd value
                });

                // Every time there's an update to the price
                bitfinexWebsocket.on('ticker', (ePair, ticker) => {

                    // Most ePair are of the format: tETH / tXMR, except Bitcoin
                    ePair = ePair.substring(1).toUpperCase();

                    // Get the original name of the pair from the inverted map.
                    let pair = invertedMap[ePair];

                    // And update the prices object.
                    if (pair) {

                        prices[pair] = {
                            exchange: 'bitfinex',
                            pair: pair,
                            ask: parseFloat(ticker.ASK),
                            mid: parseFloat((parseFloat(ticker.ASK) + parseFloat(ticker.BID)) / 2),
                            bid: parseFloat(ticker.BID),
                        };

                        // logger.log( pair + ' bid: ' + prices[pair].bid + ', ask: ' + prices[pair].ask );
                    }
                    if (!pair || pair === 'BTCUSD') {
                        usdPrices[ePair] = {
                            exchange: 'bitfinex',
                            pair: ePair,
                            ask: parseFloat(ticker.ASK),
                            mid: parseFloat((parseFloat(ticker.ASK) + parseFloat(ticker.BID)) / 2),
                            bid: parseFloat(ticker.BID),
                        };
                    }

                    // Only resolve after the price has been found.
                    if (!foundPrice) {
                        resolve(prices);
                        foundPrice = true;
                    }
                });
            });
        });
    };

    let _parseTradeArguments = function (balance, pair, side, amount) {

        /*
        *
        * Preps an object to place an order.
        *
        * args:
        *
        * [balance, pair, side, amount]
        *
        * returns:
        *
        *
        // {
        //     "pair": "ETHBTC",
        //     "price": 0.029201,
        //     "amount": "0.30",
        //     "exchangePairName": "ETHBTC",
        //     "exchange": "bitfinex",
        //     "side": "buy",
        //     "type": "limit"
        // }
        *
        * */

        let res = {
            data: {},
            error: null
        };

        let sides = ['buy', 'sell'];
        let price = side === 'buy' ? prices[pair].ask : prices[pair].bid;
        let exchangePairName = exchangePairNames[pair];
        let exchangeBalance = balance[pair].balance.toFixed(2);

        if (!_.includes(sides, side)) {
            res.error = 'No valid side provided';
        }
        else if (!_.includes(_.keys(exchangePairNames), pair) || !exchangePairName || !exchangePairName.length) {
            res.error = 'No valid pair name provided';
        }
        else if (!_.isNumber(balance[pair].balance) || !exchangeBalance.length) {
            res.error = 'No valid exchangeBalance provided';
        }
        else if (!_.isNumber(price) || !price) {
            res.error = 'No valid price provided';
        }
        else {
            res.data = {
                pair,
                price: price.toString(),
                amount: ( amount || exchangeBalance ).toString(),
                exchangePairName,
                exchange: 'bitfinex',
                side,
                type: 'limit'
            };
        }
        return res;
    };

    let _trade = function (pair, side) {

        /*
        *
        * Decides the type of order to be placed.
        *
        * args:
        *
        * [pair, side]
        *
        * returns:
        *
        *   state = {
        *       ETHBTC: {
        *           orders: [],
        *           positions: [],
        *           side: 'buy'
        *       }
        *   }
        *
        * */

        logger.log('trade');

        return new Promise((resolve, reject) => {

            _getState().then(state => {

                // There is already an active position for this pair
                if (state[pair] && state[pair].side === side) {

                    // The sides are the same. No adding to a position for now.
                    reject('There is already a ' + side + ' in place for ' + pair);
                }
                else if( state[pair] && state[pair].side !== side ) {

                    // Swing trade - exit and then place new order
                    _exit(pair).then(() => {

                        logger.log('Exited!');

                        // Once the initial position has been exited, place the new order.
                        _order(pair, side).then(() => {

                            logger.log('Ordered!');

                            // Check that the state has changed to the new side
                            _stateHasChanged(pair, side).then(resolve).catch(reject);

                        }).catch(reject)
                    }).catch(reject);
                }
                else {

                    // Vanilla trade
                    _order(pair, side).then(() => {

                        // Check that the state has changed to the new side
                        _stateHasChanged(pair, side).then(resolve).catch(reject);

                    }).catch(reject);
                }
            })
        })
    };

    let _order = function (pair, side, amount) {

        /*
        *
        * Places an order to bitfinex.
        *
        * args:
        *
        * [pair, side, amount]
        *
        * returns:
        *
        * */

        logger.log('order');

        return new Promise((resolve, reject) => {

            _getBalance().then(balance => {

                let tradeData = _parseTradeArguments(balance, pair, side, amount);

                if (!tradeData.error){

                    tradeData = tradeData.data;

                    // symbol, amount, price, exchange, side, type, is_hidden, postOnly, cb
                    bitfinexRest.new_order(tradeData.exchangePairName, tradeData.amount, tradeData.price, tradeData.exchange, tradeData.side, tradeData.type, (err, data) => {

                        if (!err) {
                            resolve();
                        }
                        else {
                            reject(err);
                        }
                    });

                }
                else {
                    reject(tradeData.error);
                }

            }).catch(reject);
        });
    };

    return {
        init: _init,
        exit: _exit,
        trade: _trade,
        order: _order,
        getState: _getState,
        getBalance: _getBalance,
        getActiveOrders: _getActiveOrders,
        getActivePositions: _getActivePositions,
    };

})();