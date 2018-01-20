module.exports = (function() {

    "use strict";

    const prompt = require('prompt');
    const exchange = require('./exchanges/bitfinex');
    const logger = require('./utils/logger');

    prompt.start();

    let pairs = ['ETHBTC'];

    exchange.init(pairs).catch(logger.error);

    (function getIntput(result){

        if(result) logger.log(result);
        logger.log(`Pick an action: [b]alances, [buy], [sell], [e]xit, [s]tate, [o]rders, [p]ositions`);

        // Get user input
        prompt.get(['action'], function (err, res) {
            if(!err && res.action){
                switch( res.action ){
                    case 'b':
                        exchange.getBalances().then(getIntput).catch(logger.error);
                        break;
                    case 'buy':
                        exchange.trade('ETHBTC', 'buy').then(getIntput).catch(logger.error);
                        break;
                    case 'sell':
                        exchange.trade('ETHBTC', 'sell').then(getIntput).catch(logger.error);
                        break;
                    case 'e':
                        exchange.exit('ETHBTC').then(getIntput).catch(logger.error);
                        break;
                    case 's':
                        exchange.getState().then(getIntput).catch(logger.error);
                        break;
                    case 'o':
                        exchange.getActiveOrders().then(getIntput).catch(logger.error);
                        break;
                    case 'p':
                        exchange.getActivePositions().then(getIntput).catch(logger.error);
                        break;
                    default:
                        getIntput('Wrong selection');
                        break;
                }
            }
        });
    }());

})();
