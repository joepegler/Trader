module.exports = (function() {

    "use strict";

    let exchange, db;

    function init(_exchange, _db){
        return new Promise((resolve) => {
            exchange = _exchange;
            db = _db;
            resolve('Initiated toolkit');
        });
    }

    function performAction(action, options){
        return new Promise((resolve, reject) => {
            switch( action ) {
                case 'buy':
                    db.saveOrder('.002', 'BTCUSD').then(signal => exchange.placeTradesWithDbOrders().then(resolve).catch(reject)).catch(reject);
                    break;
                case 'sell':
                    db.saveOrder('-0.002', 'BTCUSD').then(signal => exchange.placeTradesWithDbOrders().then(resolve).catch(reject)).catch(reject);
                    break;
                case 'state':
                    exchange.getState().then(resolve).catch(reject);
                    break;
                case 'o':
                case 'orders':
                    exchange.getOrders().then(resolve).catch(reject);
                    break;
                case 'p':
                case 'positions':
                    exchange.getPositions().then(resolve).catch(reject);
                    break;
                case 'b':
                case 'balance':
                    exchange.getBalance().then(resolve).catch(reject);
                    break;
                case 'r':
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

