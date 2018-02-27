module.exports = (function() {

    "use strict";

    const exchange = require('./exchanges/bitfinex'),
        logger = require('./tools/logger'),
        express = require('express'),
        app = express(),
        bodyParser = require('body-parser'),
        AUTH_TOKEN = 'JB#47D$E9SdYap%A14&K';

    let pairs = ['ETHBTC', 'BCHBTC', 'LTCBTC', 'XRPBTC', 'BTCUSD', 'DSHBTC'];

    app.listen(8000);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    exchange.init(pairs).catch(logger.error);
    logger.init(exchange);

    app
        .all('*', function (req, res, next) {

            // Verify authKey
            let authKey = req.headers.auth_key.toString();

            if (authKey === AUTH_TOKEN){
                next();
            }
            else {
                logger.error('Authentication failure: ' + req.headers.auth_key.toString());
                res.status(401).send({error: 'Authentication fail'});
            }
        })
        .post('/sell', function(req, res) {

            // Short sell a pair
            let pair = req.body.pair.toUpperCase();
            let amount = req.body.amount.toUpperCase();

            exchange
                .trade(pair, 'sell', amount)
                .then( status => {
                    res.status(200).send(status);
                })
                .catch(err => {
                    logger.error(err);
                    res.status(500).send({error: err});
                });
        })
        .post('/buy', function(req, res) {

            // Margin buys a pair
            let pair = req.body.pair.toUpperCase();
            let amount = req.body.amount.toUpperCase();

            exchange
                .trade(pair, 'buy', amount)
                .then( status => {
                    res.status(200).send(status);
                })
                .catch(err => {
                    logger.error(err);
                    res.status(500).send({error: err});
                });
        })
        .post('/close', function(req, res) {

            // closes any open position by pair
            let pair = req.body.pair.toUpperCase();

            exchange
                .close(pair)
                .then( status => { res.status(200).send(status); })
                .catch(err => {
                    logger.error(err);
                    res.status(500).send({error: err});
                });
        })
        .get('/state', function(req, res) {

            // Gets the current state of the bot.
            exchange
                .getState()
                .then(status => {
                    res.status(200).send(status);
                })
                .catch(err => {
                    logger.error(err);
                    res.status(500).send({error: err});
                });
        });
})();