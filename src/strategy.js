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
            setInterval(() => { tradeStrategy('BTCUSD') }, strategyOptions.timeframe.ms);
            tradeStrategy('BTCUSD');
            resolve('Initiated strategy');
        });
    }

    async function tradeStrategy(pair){

        try {

            // Calculate
            ticker++;

            let message;

            // Exchange balance
            let balance = await exchange.getBalance(pair);

            // Exchange state
            let exchangeState = await exchange.getState(pair);

            // Exchange orders
            let exchangeOrders = exchangeState.orders;

            // Exchange positions
            let exchangePositions = exchangeState.positions;

            // Exchange Position
            let exchangePosition = exchangePositions[0];

            // Database orders
            let databaseOrders = await db.getIncompleteOrders(pair);

            // Database positions
            let databasePositions = await db.getOpenPositions(pair);

            // Database position
            let databasePosition = databasePositions[0];

            // Signal
            let signal = await signaller.getSignal(pair, strategyOptions.timeframe.duration, strategyOptions.maxLookback);

            // Portion from balance
            let size = Math.round((balance / strategyOptions.installments) * 100) / 100;

            // Set size to minimum amount while testing
            if(process.argv[2] === 'dev') size = '0.002';

            // Bot is idle when there are no exchange orders, no
            let idle = !exchangeOrders.length && !exchangePositions.length && !databaseOrders.length;

            // Bot is active and in sync when there is a single open database position, there is a single open exchange position and they are for the same asset
            let activeAndInSync = (databasePositions && databasePositions.length === 1) &&
                (exchangePositions && exchangePositions.length === 1) &&
                (exchangePosition && databasePosition && exchangePosition.pair === databasePosition.pair);

            // Log to telegram
            message = `[${ticker}] \n\n` + JSON.stringify(signal, null, 2);
            logger.log(message, null, true);

            // Idle
            if (idle) {

                if (signal.short || signal.long) {

                    let dbOrder = await db.savePositionAndOrder(strategyOptions.installments, size, pair, (signal.long ? 'buy' : 'sell'));
                    let databaseTrade = await exchange.placeTradesWithDbOrders();

                    // Log to telegram
                    logger.log(databaseTrade, null, true);

                    // Reset the ticker
                    ticker = 0;
                }
            }
            // Not idle
            else {

                if (activeAndInSync) {

                    // Database orders
                    let databaseOrders = await db.getOrdersByPositionId(databasePosition.id);

                    // When to add to a position
                    let timeToAdd = ticker === strategyOptions.topupOffset;

                    // Whether or not the open position is currently in profit.
                    let inProfit = exchangePosition && parseFloat(exchangePosition.profit) > 0;

                    // Are conditions right to add to the open position
                    let addToLong = signal.long && exchangePosition.side === 'buy' && databaseOrders.length !== parseInt(databasePosition.installments) && timeToAdd && inProfit && signal.addToLong;
                    let addToShort = signal.short && exchangePosition.side === 'sell' && databaseOrders.length !== parseInt(databasePosition.installments) && timeToAdd && inProfit && signal.addToLong;

                    // Does the position need to be closed
                    let closeLong = signal.closeLong && exchangePosition.side === 'buy';
                    let closeShort = signal.closeShort && exchangePosition.side === 'sell';

                    // Add to position
                    if (addToLong || addToShort) {

                        // How many installments deep is the position
                        let index = databaseOrders.length;

                        // What is the ratio of index to installments
                        let fraction = (index + 1) / strategyOptions.installments;

                        // Is this the last installment
                        let lastIndex = fraction === 1;

                        // Calculate the total amount that the position should be at
                        let amount = (lastIndex ? balance : parseFloat(databasePosition.size) * (index + 1)) * (databasePosition.side === 'buy' ? 1 : -1);

                        // Log to telegram
                        message = `'Adding ${databasePosition.size} to ${pair} position, total: ${amount}`;
                        logger.log(message, null, true);

                        let databaseOrder = await db.saveOrder(amount, pair, databasePosition.id, databasePosition.side);

                        let databaseTrade = await exchange.placeTradesWithDbOrders();

                        // Log to telegram
                        logger.log(databaseTrade, null, true);

                        // Reset the ticker
                        ticker = 0;

                    }
                    // Close position
                    else if (closeLong || closeShort) {

                        // Database order
                        let databaseOrder = await db.saveOrder('0.0', pair, databasePosition.id, 'close');

                        // Database trade
                        let databaseTrade = await exchange.placeTradesWithDbOrders();

                        // ID of the relevant position
                        let positionId = await db.markPositionDone(databasePosition.id, exchangePosition.profit);

                        // Log to telegram
                        message = 'Closing ' + (exchangePosition.side === 'buy' ? 'long' : 'short') + ' for a ' + (exchangePosition.profit > 0 ? 'profit' : 'loss') + ' of ' + exchangePosition.profit;
                        logger.log(message, null, true);
                        logger.log(databaseTrade, null, true);

                        // Reset the ticker
                        ticker = 0;
                    }
                }
                else {
                    logger.error("Not in sync");
                }
            }
        }
        catch(e){
            logger.error(e);
        }
    }

    return {
        init: init
    };

})();