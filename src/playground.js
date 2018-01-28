module.exports = (function() {

    "use strict";

    const prompt = require('prompt');
    const exchange = require('./exchanges/bitfinex');

    prompt.start();

    let pairs = ['ETHBTC'];

    exchange.init(pairs).catch(console.error);

    (function getIntput(result){

        if(result) console.log('***********************************\n' + JSON.stringify(result, null, 2) + '\n***********************************');
        console.log(`Pick an action: [b]alances, [buy], [sell], [c]lose, [e]xit, [s]tate, [o]rders, [p]ositions, [r]esolve`);

        // Get user input
        prompt.get(['action'], function (err, res) {
            if(!err && res.action){
                switch( res.action ){
                    case 'b':
                        exchange.getBalances().then(getIntput).catch(getIntput);
                        break;
                    case 'buy':
                        exchange.trade('ETHBTC', 'buy', '0.02').then(getIntput).catch(getIntput);
                        break;
                    case 'sell':
                        exchange.trade('ETHBTC', 'sell', '0.02').then(getIntput).catch(getIntput);
                        break;
                    case 'c':
                        exchange.close('ETHBTC').then(getIntput).catch(getIntput);
                        break;
                    case 'e':
                        exchange.exit().then(getIntput).catch(getIntput);
                        break;
                    case 's':
                        exchange.getState().then(getIntput).catch(getIntput);
                        break;
                    case 'o':
                        exchange.getActiveOrders().then(getIntput).catch(getIntput);
                        break;
                    case 'p':
                        exchange.getActivePositions().then(getIntput).catch(getIntput);
                        break;
                    case 'r':
                        exchange.resolvePendingOrders().then(getIntput).catch(getIntput);
                        break;
                    default:
                        getIntput('Wrong selection');
                        break;
                }
            }
        });
    }());

})();
