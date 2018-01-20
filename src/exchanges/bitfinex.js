module.exports = (function () {
    "use strict";
    // Initialisation
    // ----------------
    // Library imports
    const Promise = require('promise');
    const _ = require('lodash');
    const BFX = require('bitfinex-api-node');

    // Local imports
    const configKeys = require('./config');

    // Configure imports
    const bitfinexRest = new BFX(configKeys.rest.key, configKeys.rest.secret, {version: 1, transform: true}).rest;
    const bitfinexWebsocket = new BFX(configKeys.websocket.key, configKeys.websocket.secret, {
        version: 2,
        transform: true
    }).ws;

    // Local variables
    let usdPrices = {};
    let prices = {};
    let exchangePairNames = {
        ETHBTC: 'ETHBTC',
        BTCUSD: 'BTCUSD',
        LTCBTC: 'LTCBTC',
        XRPBTC: 'XRPBTC',
        XMRBTC: 'XMRBTC',
        DSHBTC: 'DSHBTC'
    };

    // Functions
    // ----------------
    // `_init` Initiates the price ticker and retrieves the current account balance
    let _init = function (pairs) {
        return new Promise((resolve, reject) => {
            exchangePairNames = _.pickBy(exchangePairNames, function (coinVal, coinName) { // exchangePairNames needs to be filtered by the 'pairs' argument
                return _.includes(pairs, coinName)
            });
            const invertedMap = _.invert(exchangePairNames);
            bitfinexWebsocket.on('open', () => { // When the websocket opens
                bitfinexWebsocket.auth(); // Authenticate once the websocket has been opened.
            });
            bitfinexWebsocket.on('error', logger.error); // When the websocket errs
            bitfinexWebsocket.on('auth', () => {
                let foundPrice = false; // Only resolve once price has been found.
                _.each(exchangePairNames, pair => { // Loop the exchange coin names and subscribe to each of the pairs
                    bitfinexWebsocket.subscribeTicker('t' + pair);
                    pair.indexOf('USD') === -1 && bitfinexWebsocket.subscribeTicker('t' + pair.slice(0, -3) + 'USD'); // also subscribe to usd value
                });
                bitfinexWebsocket.on('ticker', (ePair, ticker) => { // Every time there's an update to the price
                    ePair = ePair.substring(1).toUpperCase(); // Most ePair are of the format: tETH / tXMR, except Bitcoin
                    let pair = invertedMap[ePair]; // Get the original name of the pair from the inverted map.
                    if (pair) { // And update the prices object.
                        prices[pair] = {
                            exchange: 'bitfinex',
                            pair: pair,
                            ask: parseFloat(ticker.ASK),
                            mid: parseFloat((parseFloat(ticker.ASK) + parseFloat(ticker.BID)) / 2),
                            bid: parseFloat(ticker.BID),
                        };
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
                    if (!foundPrice) {// Only resolve after the price has been found.
                        resolve(prices);
                        foundPrice = true;
                    }
                });
            });
        });
    };

    // `_pairIsEnabled` is used to determine
    // which pairs were initialised during setup
    let _pairIsEnabled = function (pair) {
        return !!_.invert(exchangePairNames)[pair];
    };

    // `_getBalances` returns a balances array. The balances
    // list the available tradeable balance for each coin,
    // with (tradeable) and without (balance) leverage.
    //
    //      [
    //          {
    //              pair: 'ETHBTC',
    //              balance: 192.338,
    //              tradeable: 480.845
    //          }
    //      ]
    //
    let _getBalances = function () {
        return new Promise((resolve, reject) => {
            bitfinexRest.margin_infos((err, data) => { // Gets bitfinex account margin data
                if (!err) {
                    let balances = [];
                    _.each(exchangePairNames, function (exchangeCoinName, coinName) {
                        let usdPair = coinName.slice(0, -3) + 'USD';
                        balances.push({
                            pair: coinName,
                            balance: parseFloat(data[0].margin_balance / usdPrices[usdPair].ask),
                            tradeable: parseFloat(_.find(data[0].margin_limits, {on_pair: exchangeCoinName}).tradable_balance / usdPrices[usdPair].ask)
                        });
                    });
                    resolve(balances);
                }
                else {
                    reject(err); // Reject the promise
                }
            });
        });
    };

    // `_getActiveOrders` returns all active orders active on bitfinex
    //
    //      [
    //          {
    //              "id":5243424763,
    //              "pair":"ETHBTC",
    //              "price": 0.043615,
    //              "side":"buy"
    //          },
    //      ]
    let _getActiveOrders = function () {
        return new Promise((resolve, reject) => {
            bitfinexRest.active_orders(function (err, activeOrderResponse) {
                if (!err) {
                    //      activeOrderResponse = [
                    //          {
                    //              "id":5243424763,
                    //              "cid":59796173969,
                    //              "cid_date":"2017-11-18",
                    //              "gid":null,
                    //              "symbol":"ethbtc",
                    //              "exchange":null,
                    //              "price":"0.043615",
                    //              "avg_execution_price":"0.0",
                    //              "side":"buy",
                    //              "type":"limit",
                    //              "timestamp":"1511022996.0",
                    //              "is_live":true,
                    //              "is_cancelled":false,
                    //              "is_hidden":false,
                    //              "oco_order":null,
                    //              "was_forced":false,
                    //              "original_amount":"0.25",
                    //              "remaining_amount":"0.25",
                    //              "executed_amount":"0.0",
                    //              "src":"web"
                    //          }
                    //      ];
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
                    resolve(activeOrders);
                }
                else {
                    reject(err);
                }
            });
        });
    };

    // `_getActivePositions` returns all active positions active on bitfinex
    //
    //     [
    //          {
    //              id: 38168717,
    //              pair: 'ETHBTC',
    //              base: 0.043646,
    //              amount: .25,
    //              profit: -0.000030805,
    //              side: 'buy'
    //          }
    //     ]
    let _getActivePositions = function () {
        return new Promise((resolve, reject) => {
            bitfinexRest.active_positions(function (err, activePositionResponse) {
                if (!err) {
                    //      activePositionResponse = [
                    //          {
                    //              id: 38168717,
                    //              symbol: 'ethbtc',
                    //              status: 'ACTIVE',
                    //              base: '0.043646',
                    //              amount: '0.25',
                    //              timestamp: '1511022525.0',
                    //              swap: '0.0',
                    //              pl: '-0.000030805'
                    //          }
                    //      ]
                    if (activePositionResponse.length) {
                        let activePositionArr = [];
                        const invertedMap = _.invert(exchangePairNames);
                        activePositionResponse.forEach((activePos, i) => {
                            //      {
                            //          "id": 38613045,
                            //          "symbol": "btcusd",
                            //          "status": "ACTIVE",
                            //          "base": "11150.0",
                            //          "amount": "0.071",
                            //          "timestamp": "1512211440.0",
                            //          "swap": "-0.4426557",
                            //          "pl": "42.986382"
                            //      }
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
                            resolve(activePositionArr);
                        });
                    }
                    else {
                        resolve([]); // There aren't any active positions
                    }
                }
                else {
                    reject(err);
                }
            });
        });
    };

    // `_getState` gets bot state
    //
    //     state = {
    //         "state": "active",
    //         "balances": [{
    //             "pair": "ETHBTC",
    //             "balance": 0.13802080706832412,
    //             "tradeable": 0.3130893379539062
    //         }],
    //         "activePairs": [{
    //             "pair": "ETHBTC",
    //             "balance": 0.13802080706832412,
    //             "side": "buy",
    //             "positions": [{
    //                 "id": "134514333",
    //                 "pair": "ETHBTC",
    //                 "base": 0.089331,
    //                 "amount": 0.13875501,
    //                 "profit": -0.00001565073259794,
    //                 "side": "buy"
    //             }],
    //             "orders": []
    //         }]
    //     }
    let _getState = function () {
        return new Promise((resolve, reject) => {
            _getBalances().then(balances => {
                let state = {
                    state: 'idle',
                    balances: balances,
                    activePairs: []
                };
                _getActivePositions().then(activePositions => {
                    _getActiveOrders().then(activeOrders => {
                        activePositions.forEach(position => {
                            //     position = {
                            //         id: 38168717,
                            //         pair: 'ETHBTC',
                            //         base: 0.043646,
                            //         amount: .25,
                            //         profit: -0.000030805,
                            //         side: 'buy'
                            //     }
                            if (_pairIsEnabled(position.pair)) {
                                let activePair = _.find(state.pairs, {pair: position.pair});
                                let activePairIndex = _.findIndex(state.pairs, {pair: position.pair});
                                if (!activePair) { // Set the state to active
                                    state.state = 'active';
                                    let balance = _.find(balances, {pair: position.pair});
                                    if (balance) balance = balance.balance;
                                    activePair = { // Initialise the activePair with default state.
                                        pair: position.pair,
                                        balance: balance,
                                        side: position.side,
                                        positions: [],
                                        orders: []
                                    };
                                    state.activePairs.push(activePair);
                                    activePairIndex = state.activePairs.length - 1;
                                }
                                state.activePairs[activePairIndex].positions.push(position);
                            }
                        });
                        activeOrders.forEach(order => {
                            //      order = {
                            //          "id":5243424763,
                            //          "pair":"ETHBTC",
                            //          "price": 0.043615,
                            //          "side":"buy"
                            //      }
                            if (_pairIsEnabled(order.pair)) {
                                let activePair = _.find(state.pairs, {pair: order.pair});
                                let activePairIndex = _.findIndex(state.pairs, {pair: order.pair});
                                if (!activePair) {
                                    state.state = 'active'; // Set the state to active
                                    activePair = {// Initialise the activePair with default state.
                                        side: order.side === 'buy' ? 'buy' : 'sell',
                                        positions: [],
                                        orders: []
                                    };
                                    state.activePairs.push(activePair);
                                    activePairIndex = state.activePairs.length - 1;
                                }
                                state.activePairs[activePairIndex].orders.push(order);
                            }
                        });
                        resolve(state);
                    }).catch(reject);
                }).catch(reject);
            }).catch(reject);
        });
    };

    // `_stateHasChanged` checks to ensure that the state of the bot
    // has changed. Retries every 10 seconds for up to a minute.
    let _stateHasChanged = function (pair, stateTest) {
        let hardStop = 1000 * 60; // one minute
        let retry_interval = 1000 * 5; // 10 seconds
        return new Promise((resolve, reject) => {
            let __stateHasChanged = function (pair, stateTest) {
                _getState().then(state => {
                    let activePair = _.find(state.activePairs, {pair: pair});
                    if (
                        (state.state === 'active' && activePair.side === stateTest) || // 'There are active positions and the side of the positions matches the test state'
                        (!activePair && stateTest === 'idle')) { // There are no active positions and the test state is 'idle'.
                        resolve(state); // Resolve with the current state
                    }
                    else {
                        if (hardStop > 0) { // If time still less than the hard stop
                            setTimeout(() => {
                                __stateHasChanged(pair, stateTest); // recursive call, try again
                                hardStop -= retry_interval;// countdown
                            }, retry_interval)
                        }
                        else {
                            reject('Failed to change the state.');
                        }
                    }
                })
            };
            __stateHasChanged(pair, stateTest);
        });
    };

    // `_exit` Exits all active orders and trades for a given pair;
    let _exit = function (pair) {
        return new Promise((resolve, reject) => {
            _getState().then(state => {
                let activePair = _.find(state.activePairs, {pair: pair});
                if (state.state === 'active' && activePair) {
                    let orders = activePair.orders.map(order => { // Cancel all active orders
                        return _cancelOrder(order.id);
                    });
                    let positions = activePair.positions.map(pos => {
                        let side = pos.side === 'buy' ? 'sell' : 'buy';
                        let amount = Math.abs(parseFloat(pos.amount)).toString();
                        return _order(pair, side, amount); // Place a cancellation order for each position, with the opposite side and the same amount.
                    });
                    let cancellations = positions.concat(orders); // Cancel both orders and positions
                    Promise.all(cancellations).then(() => { // Once all orders and positions have been exited
                        _stateHasChanged(pair, 'idle').then(resolve).catch(reject); // Ensure that the state has changed to idle.
                    }).catch(reject);
                }
                else {
                    resolve('No active positions for ' + pair); // Resolve because bot was already idle for that pair
                }
            })
        });
    };

    // `_cancelOrder` Cancels an order with the given order_id;
    let _cancelOrder = function (orderId) {
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

    // `_parseTradeArguments` Preps an object to place an order
    //
    //      {
    //          "pair": "ETHBTC",
    //          "price": 0.029201,
    //          "amount": "0.30",
    //          "exchangePairName": "ETHBTC",
    //          "exchange": "bitfinex",
    //          "side": "buy",
    //          "type": "limit"
    //      }
    let _parseTradeArguments = function (balances, pair, side, amount) {
        let res = {
            data: {},
            error: null
        };
        let sides = ['buy', 'sell'];
        let price = side === 'buy' ? prices[pair].ask : prices[pair].bid;
        let exchangePairName = exchangePairNames[pair];
        let exchangeBalance = _.find(balances, {pair: pair}).balance;
        if (!_.includes(sides, side)) {
            res.error = 'No valid side provided';
        }
        else if (!_.includes(_.keys(exchangePairNames), pair) || !exchangePairName || !exchangePairName.length) {
            res.error = 'No valid pair name provided';
        }
        else if (!_.isNumber(_.find(balances, {pair: pair}).balance)) {
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

    // `_trade` Decides the type of order to be placed, and then places it.
    // Returns the next state.
    let _trade = function (pair, side) {
        return new Promise((resolve, reject) => {
            _getState().then(state => {
                let activePair = _.find(state.activePairs, {pair: pair});
                if (state.state === 'active' && activePair && activePair.side === side) {// There is already an active position on the specified side for this pair.
                    reject('There is already a ' + side + ' in place for ' + pair); // The sides are the same. No adding to a position for now.
                }
                else if (state.state === 'active' && activePair && activePair.side !== side) { // Swing trade - exit and then place new order
                    _exit(pair).then(() => {
                        _order(pair, side).then(() => { // Once the initial position has been exited, place the new order.
                            _stateHasChanged(pair, side).then(resolve).catch(reject); // Check that the state has changed to the new side
                        }).catch(reject);
                    }).catch(reject);
                }
                else if (state.state === 'idle') { // The state was previously idle
                    _order(pair, side).then(() => { // Vanilla trade
                        _stateHasChanged(pair, side).then(resolve).catch(reject); // Check that the state has changed to the new side
                    }).catch(reject);
                }
                else {
                    reject('Unknown state');
                }
            })
        })
    };

    // `_order` Places an order to bitfinex.
    let _order = function (pair, side, amount) {
        return new Promise((resolve, reject) => {
            _getBalances().then(balances => {
                let tradeData = _parseTradeArguments(balances, pair, side, amount);
                if (!tradeData.error) {
                    tradeData = tradeData.data;
                    bitfinexRest.new_order(tradeData.exchangePairName, tradeData.amount, tradeData.price, tradeData.exchange, tradeData.side, tradeData.type, (err, data) => {// symbol, amount, price, exchange, side, type, is_hidden, postOnly, cb
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

    // Exposed public functions
    return {
        init: _init,
        exit: _exit,
        trade: _trade,
        order: _order,
        getState: _getState,
        getBalances: _getBalances,
        getActiveOrders: _getActiveOrders,
        getActivePositions: _getActivePositions,
    };
})();