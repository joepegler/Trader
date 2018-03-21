module.exports = (function() {

    "use strict";

    const Promise       = require('promise');
    const _             = require('lodash');
    const bodyParser    = require('body-parser');

    let authToken, exchange, logger, app;
    function init(_app, apiPort, athTkn, exchng, _logger){
        return new Promise((resolve) => {
            authToken = athTkn;
            exchange = exchng;
            logger = _logger;
            app = _app;
            app.listen(apiPort);
            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({extended: true}));
            setupEndpoints();
            resolve('Api ready. Listening on port ' + apiPort + ' using authToken ' + authToken);
        });
    }

    function setupEndpoints(){
        app
            .all('*', function (req, res, next) {

                // Verify authKey
                let authKey = req.headers.auth_key.toString();

                if (authKey === authToken){
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
                let amount = req.body.amount;

                if (pair && amount){
                    res.status(200).send({data: 'submitted sell order for ' + amount + ' ' + pair});
                    exchange
                        .trade(pair, 'sell', amount)
                        .then(logger.log)
                        .catch(logger.error);
                }
                else {
                    res.status(500).send({error: 'Missing parameter'})
                }

            })
            .post('/buy', function(req, res) {

                // Margin buys a pair
                let pair = req.body.pair.toUpperCase();
                let amount = req.body.amount;

                if (pair && amount){
                    res.status(200).send({data: 'submitted buy order for ' + amount + ' ' + pair});
                    exchange
                        .trade(pair, 'buy', amount)
                        .then(logger.log)
                        .catch(logger.error);
                }
                else {
                    res.status(500).send({error: 'Missing parameter'})
                }

            })
            .post('/close', function(req, res) {

                // closes any open position by pair
                let pair = req.body.pair.toUpperCase();
                if (pair) {
                    exchange
                        .close(pair)
                        .then(logger.log)
                        .catch(logger.error);

                    res.status(200).send({data: 'submitted close order for ' + pair});
                }
                else {
                    res.status(500).send({error: 'Missing parameter'})
                }
            })
            .post('/resolve', function(req, res) {

                // resolves open orders
                let pair = req.body.pair.toUpperCase();
                if (pair) {

                    exchange
                        .resolvePendingOrders(pair)
                        .then(logger.log)
                        .catch(logger.error);

                    res.status(200).send({data: 'attempting to resolve unfilled orders for ' + pair});
                }
                else {
                    res.status(500).send({error: 'Missing parameter'})
                }
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

    }

    return {
        init : init
    }

})();