module.exports = (function () {
    "use strict";
    // Initialisation
    // ----------------
    // Library imports
    const Promise = require('promise');
    const _ = require('lodash');
    const BFX = require('bitfinex-api-node');

    // Configure imports
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
    let bitfinexRest, bitfinexWebsocket, logger, asMaker;

    // Functions
    // ----------------
    // `_init` Initiates the price ticker and retrieves the current account balance
    let _init = (pairs, configKeys, _logger, _asMaker) => {
        return new Promise((resolve) => {

            logger = _logger;
            asMaker = _asMaker;

            bitfinexRest = new BFX(configKeys.rest.key, configKeys.rest.secret, {version: 1, transform: true}).rest;
            bitfinexWebsocket = new BFX(configKeys.websocket.key, configKeys.websocket.secret, { version: 2, transform: true }).ws;

            exchangePairNames = _.pickBy(exchangePairNames, function (coinVal, coinName) { // exchangePairNames needs to be filtered by the 'pairs' argument
                return _.includes(pairs, coinName)
            });
            const invertedMap = _.invert(exchangePairNames);
            bitfinexWebsocket.on('open', () => { // When the websocket opens
                bitfinexWebsocket.auth(); // Authenticate once the websocket has been opened.
            });
            bitfinexWebsocket.on('error', logger.error); // When the websocket errs

            bitfinexWebsocket.on('message', (data) => {
                if (data[1] === "tu"){
                    let tradeArr = data[2];
                    let trade = {
                        id: tradeArr[0],
                        pair: tradeArr[1].substring(1).toUpperCase(),
                        ts: tradeArr[2],
                        order_id: tradeArr[3],
                        amount: tradeArr[4],
                        price: tradeArr[5],
                        type: tradeArr[6],
                        order_price: tradeArr[7],
                        maker: tradeArr[8],
                        fee: tradeArr[9],
                        fee_currency: tradeArr[10],
                    };
                    logger.log('[TRADE]', trade, true);
                }
            });

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
    let _getBalances = () => {
        logger.log('getBalances');
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
                    reject('Couldn\'t retrieve your balance: ' + JSON.stringify(err));
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
    let _getActiveOrders = () => {
        logger.log('getActiveOrders');
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
                            side: activeOrder.side,
                            remaining_amount: parseFloat(activeOrder.remaining_amount).toString()
                        })
                    });
                    resolve(activeOrders);
                }
                else {
                    reject('Couldn\'t retrieve your active orders');
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
    let _getActivePositions = () => {
        logger.log('getActivePositions');
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
                    reject('Couldn\'t retrieve your active positions');
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
    //             "orders": [{
    //                  "id":5243424763,
    //                  "pair":"ETHBTC",
    //                  "price": 0.043615,
    //                  "side":"buy",
    //                  "remaining_amount": 10
    //             }]
    //         }]
    //     }
    let _getState = () => {
        logger.log('getState');
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
                            if (utils.pairIsEnabled(position.pair)) {
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
                            if (utils.pairIsEnabled(order.pair)) {
                                let activePair = _.find(state.pairs, {pair: order.pair});
                                let activePairIndex = _.findIndex(state.pairs, {pair: order.pair});
                                if (!activePair) {
                                    state.state = 'pending';
                                    let balance = _.find(balances, {pair: order.pair});
                                    if (balance) balance = balance.balance;
                                    activePair = {// Initialise the activePair with default state.
                                        pair: order.pair,
                                        balance: balance,
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

    // `_exit` Exits all active orders and trades
    let _exit = () => {
        logger.log('exit');
        return new Promise((resolve, reject) => {
            let cancellations = [];
            _getState().then(state => {
                let activePairs = [];
                state.activePairs.forEach(activePair => {
                    activePair.positions.forEach(position => {
                        activePairs.push(position.pair);
                    });
                    activePair.orders.forEach(order => {
                        activePairs.push(order.pair);
                    });
                });
                cancellations = _.uniq(activePairs).map(pair => { return _close(pair) });
                if ( !cancellations.length ){
                    resolve('Bot is already idle');
                }
                else {
                    Promise.all(cancellations).then(closeResponseArray => {
                        resolve('Closed ' + cancellations.length + ' positions and orders.');
                    }).catch(reject);
                }
            }).catch(reject);
        });
    };

    // `_close` Exits all active orders and trades for a given pair.
    let _close = function (pair) {
        logger.log('close: ' + pair);
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
                    let cancellations = orders.concat(positions); // Cancel both orders and positions
                    Promise.all(cancellations).then(resolve).catch(reject);
                }
                else {
                    resolve('No active positions for ' + pair); // Resolve because bot was already idle for that pair
                }
            }).catch(reject)
        });
    };

    // `_cancelOrder` Cancels an order with the given order_id;
    let _cancelOrder = (orderId) => {
        logger.log('cancelOrder ' + orderId);
        return new Promise((resolve, reject) => {
            bitfinexRest.cancel_order(orderId.toString(), (err, res) => {
                if (!err) {
                    logger.log('Cancelled order: ' + orderId );
                    resolve(res);
                }
                else {
                    reject('Couldn\'t cancel your order ' + orderId, err);
                }
            });
        });
    };

    // `_order` Places an order to bitfinex.
    // Orders should be succesfully sent and accepted every time, but they will not always fill
    let _order = (pair, side, amount, maker) => {
        return new Promise((resolve, reject) => {
            _getBalances().then(balances => {
                let tradeData = utils.parseTradeArguments(balances, pair, side, amount, maker);
                if (!tradeData.error) {
                    tradeData = tradeData.data;
                    logger.log('Placing a new order: ', tradeData, true);
                    bitfinexRest.new_order(tradeData.exchangePairName, tradeData.amount, tradeData.price, tradeData.exchange, tradeData.side, tradeData.type, false, tradeData.maker, (err) => {// symbol, amount, price, exchange, side, type, is_hidden, postOnly, cb
                        if (!err) {
                            resolve('Successfully placed a ' + tradeData.pair + ' ' + tradeData.side + ' order for ' + tradeData.amount + ' at a price of ' + tradeData.price + (tradeData.maker ? ' as maker' : ' as taker'));
                        }
                        else {
                            reject('Couldn\'t place your order: ', err);
                        }
                    });
                }
                else {
                    reject(tradeData.error);
                }
            }).catch(reject);
        });
    };

    // `_swingTrade` Attempts to change state from buy to sell or vice versa.
    // It is only possible to swing trade if there are no active orders and an active position.
    let _swingTrade = (pair, side) => {
        logger.log('swingTrade ' + ', ' + pair + ', ' + side);
        return new Promise((resolve, reject) => {
            _getState().then(state => {
                let activePair = _.find(state.activePairs, {pair: pair});
                let amount = Math.abs(parseFloat(activePair.positions[0].amount)).toString();
                let repeater = () => {
                    utils.recursiveTry(_stateHasChanged, [pair, 'idle'], 'stateHasChanged', 5, 5).then(() => { // then poll for state change
                        logger.log('Now idle');
                        _openNewPosition(pair, side, amount).then(resolve).catch(reject);
                    }).catch(reject)
                };
                if (state.state === 'active' && activePair && activePair.side !== side) { // Swing trade - exit and then place new order in new direction
                    _close(pair).then(repeater).catch(reject);
                }
                else {
                    reject('Cannot swing trade when bot ' + state.state);
                }
            }).catch(reject);
        })
    };

    // `_openNewPosition` Places a trade if the bot had previously been idle.
    let _openNewPosition = (pair, side, amount, maker) => {
        logger.log('openNewPosition ' + pair + ', ' + side + ', ' + amount);
        return new Promise((resolve, reject) => {
            let repeater = () => {
                utils.recursiveTry(_stateHasChanged, [pair, side], 'stateHasChanged', 5, 5).then(resolve).catch(()=>{ // Poll for state change. Resolve pending orders again if it fails.
                    _resolvePendingOrders().then(repeater).catch(reject); // Repeat until the state successfully changes to idle.
                })
            };
            _getState().then(state => {
                let activePair = _.find(state.activePairs, {pair: pair});
                if (state.state === 'idle' || (state.state === 'active' && !activePair )) { // The state was previously idle
                    _order(pair, side, amount, maker).then(repeater).catch(reject);
                }
                else {
                    reject('Cannot open a new position when bot is ' + state.state);
                }
            }).catch(reject);
        })
    };

    // `_resolvePendingOrders` Places cancels all active orders and places them again with a new price and amount if there was a partial fill.
    let _resolvePendingOrders = () => {
        logger.log('resolvePendingOrders');
        return new Promise((resolve, reject) => {
            _getState().then(state => {
                if (state.state === 'pending') { // The state was previously pending
                    let pendingPair = _.find(state.activePairs, aP => { return aP.orders.length === 1; });
                    let order = pendingPair.orders[0]; // There should only ever be one order.
                    let maker = false; // When resolving an order place the trade as a taker
                    _cancelOrder( order.id ).then(() => {
                        _openNewPosition(order.pair, order.side, order.remaining_amount, maker).then(resolve).catch(reject); // Updates the order price
                    }).catch(reject);
                }
                else {
                    reject('Cannot resolve pending orders when bot is ' + state.state);
                }
            }).catch(reject);
        })
    };

    // `_trade` Decides the type of order to be placed, and then places it.
    // Returns the next state.
    let _trade = (pair, side, amount) => {
        logger.log('trade ' + pair + ', ' + side + ',' + amount);
        return new Promise((resolve, reject) => {
            _getState().then(state => {
                let activePair = _.find(state.activePairs, {pair: pair});
                if (state.state === 'active' && activePair && activePair.side !== side) { // Swing trade - exit and then place new order in new direction
                    _swingTrade(pair, side).then(resolve).catch(reject);
                }
                else if (state.state === 'idle' || (state.state === 'active' && !activePair )) { // The state was previously idle or it's active but only for a different pair
                    _openNewPosition(pair, side, amount).then(resolve).catch(reject);
                }
                else if (state.state === 'active' && activePair && activePair.side === side) {// There is already an active position on the specified side for this pair.
                    reject('There is already a ' + side + ' in place for ' + pair); // The sides are the same. No adding to a position for now.
                }
                else if (state.state === 'pending'){
                    reject('Cannot place trades when bot is ' + state.state);
                }
            }).catch(reject);
        })
    };

    // `stateHasChanged` checks to ensure that the state of the bot
    // has changed. Retries every 3 seconds for up to 15 seconds.
    let _stateHasChanged = (pair, stateTest) => {
        logger.log('stateHasChanged: ' + pair + ', ' + stateTest);
        return new Promise((resolve, reject) => {
            _getState().then(state => {
                let activePair = _.find(state.activePairs, {pair: pair});
                if (
                    (state.state === 'active' && activePair.side === stateTest) || // 'There are active positions and the side of the positions matches the test state'
                    (!activePair && stateTest === 'idle')) { // There are no active positions and the test state is 'idle'.
                    logger.log(state, null, true);
                    resolve(state); // Resolve with the current state
                }
                else {
                    reject('Failed to change the state.');
                }
            }).catch(reject)
        });
    };

    let utils = {
        // `recursiveTry` is a helper function used to attempt a function the noOfAttempts is exceeded.
        recursiveTry: (attemptFunction, args, name, noOfAttempts, delay) => {
            return new Promise((resolve, reject) => {
                delay = _.isNumber(delay) ? delay : 0; // Default delay is 0
                let retryCount = noOfAttempts || 5; // Allows five failed attempts at executing the attemptFunction
                let newAttempt = () => {
                    attemptFunction.apply(this, args).then(resolve).catch(tryAgain);
                };
                let tryAgain = () => {
                    logger.log('recursiveTry (' + retryCount + ') ' + name + ', ', args);
                    retryCount--;
                    if (retryCount) {
                        setTimeout(newAttempt, delay * 1000);
                    }
                    else {
                        reject('Failed ' + name + ' ' + noOfAttempts + ' times.');
                    }
                };
                tryAgain(); // Try for the first time.
            });
        },
        // `parseTradeArguments` Preps an object to place an order
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
        parseTradeArguments: (balances, pair, side, amount, maker) => {
            logger.log('parseTradeArguments ' + JSON.stringify(balances) + ', ' + pair + ', ' + side + ', ' + amount);
            let res = {
                data: {},
                error: null
            };
            let sides = ['buy', 'sell'];
            maker = _.isBoolean(maker) ? maker : asMaker;
            let price = side === 'buy' ? prices[pair][maker?'bid':'ask'] : prices[pair][maker?'ask':'bid'];
            let exchangePairName = exchangePairNames[pair];
            let exchangeBalance = _.find(balances, {pair: pair}).balance;
            if (!_.includes(sides, side)) {
                res.error = 'No valid side provided';
            }
            else if (!_.includes(_.keys(exchangePairNames), pair) || !exchangePairName || !exchangePairName.length) {
                res.error = 'No valid pair name provided';
            }
            else if (!_.isNumber(parseFloat(amount)) && amount !== '*'){
                res.error = 'Invalid amount provided'
            }
            else if (amount === '*' &&  !_.isNumber(exchangeBalance)) {
                res.error = 'exchangeBalance not valid';
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
                    maker,
                    type: 'limit'
                };
            }
            return res;
        },
        // `pairIsEnabled` is used to determine
        // which pairs were initialised during setup
        pairIsEnabled: pair => {
            return !!_.invert(exchangePairNames)[pair];
        }
    };

    // Exposed public functions
    return {
        init: _init,
        close: _close,
        exit: _exit,
        trade: _trade,
        order: _order,
        getState: _getState,
        getBalances: _getBalances,
        getActiveOrders: _getActiveOrders,
        getActivePositions: _getActivePositions,
        resolvePendingOrders: _resolvePendingOrders
    };
})();