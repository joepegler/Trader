module.exports = (function() {

    "use strict";

    let exchange;

    function init(_exchange){
        return new Promise((resolve) => {
            exchange = _exchange;
            resolve('Initiated toolkit');
        });
    }

    function performAction(action){
        return new Promise((resolve, reject) => {
            switch( action ) {
                case 'b':
                case 'balance':
                    exchange.getBalances().then(resolve).catch(reject);
                    break;
                case 'buy':
                    exchange.trade('ETHBTC', 'buy', '0.02').then(resolve).catch(reject);
                    break;
                case 'sell':
                    exchange.trade('ETHBTC', 'sell', '0.02').then(resolve).catch(reject);
                    break;
                case 'c':
                case 'close':
                    exchange.close('ETHBTC').then(resolve).catch(reject);
                    break;
                case 'e':
                case 'exit':
                    exchange.exit().then(resolve).catch(reject);
                    break;
                case 's':
                case 'state':
                    exchange.getState().then(resolve).catch(reject);
                    break;
                case 'o':
                case 'orders':
                    exchange.getActiveOrders().then(resolve).catch(reject);
                    break;
                case 'p':
                case 'positions':
                    exchange.getActivePositions().then(resolve).catch(reject);
                    break;
                case 'r':
                case 'repair':
                    exchange.resolvePendingOrders().then(resolve).catch(reject);
                    break;
                default:
                    reject('Wrong selection');
                    break;
            }
        });
    }

    return {
        init: init,
        performAction: performAction,
    }

})();

