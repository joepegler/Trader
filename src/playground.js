module.exports = (function() {

    "use strict";

    const prompt = require('prompt');
    const exchange = require('./exchanges/bitfinex.js');
    const logger = require('./tools/logger.js');

    const express =  require('express');
    const path = require('path');
    const app = express();
    const server = require('http').createServer(app);
    const io = require('socket.io')(server);

    (function init(){

        prompt.start();
        exchange.init(['ETHBTC']).catch(console.error);
        logger.init(exchange, io);
        server.listen(8881);
        app.use(express.static(path.join(__dirname, '/www')));
        io.on('connection', client => {
            client.on('action', performAction);
        });

        getIntput();

    }());

    function getIntput(result){

        if(result) logger.log(result);
        console.log(`Pick an action: [b]alances, [buy], [sell], [c]lose, [e]xit, [s]tate, [o]rders, [p]ositions, [r]esolve`);

        // Get user input
        prompt.get(['action'], function (err, res) {
            if(!err && res.action) performAction( res.action );
        });

    }

    function performAction(action){

        switch( action ){
            case 'b':
            case 'balance':
                exchange.getBalances().then(getIntput).catch(getIntput);
                break;
            case 'buy':
                exchange.trade('ETHBTC', 'buy', '0.02').then(getIntput).catch(getIntput);
                break;
            case 'sell':
                exchange.trade('ETHBTC', 'sell', '0.02').then(getIntput).catch(getIntput);
                break;
            case 'c':
            case 'close':
                exchange.close('ETHBTC').then(getIntput).catch(getIntput);
                break;
            case 'e':
            case 'exit':
                exchange.exit().then(getIntput).catch(getIntput);
                break;
            case 's':
            case 'state':
                exchange.getState().then(getIntput).catch(getIntput);
                break;
            case 'o':
            case 'orders':
                exchange.getActiveOrders().then(getIntput).catch(getIntput);
                break;
            case 'p':
            case 'positions':
                exchange.getActivePositions().then(getIntput).catch(getIntput);
                break;
            case 'r':
            case 'repair':
                exchange.resolvePendingOrders().then(getIntput).catch(getIntput);
                break;
            default:
                getIntput('Wrong selection');
                break;
        }
    }

})();
