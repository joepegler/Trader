module.exports = (function() {

    "use strict";

    const Promise       = require('promise');
    const bodyParser    = require('body-parser');

    let authToken, exchange, logger, app, db;
    function init(_app, apiPort, athTkn, exchng, _logger, _db){
        return new Promise((resolve) => {
            db = _db;
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
            .post('/trade', function(req, res) {

                // Short sell a pair
                let pair = req.body.pair.toUpperCase();
                let amount = req.body.amount;

                if (pair && amount){
                    db.saveOrder(amount, pair).then(signal => {
                        res.status(200).send({data: 'Signal saved: ' + signal});
                        exchange.placeTradesWithDbOrders().then(logger.log).catch(logger.error);
                    }).catch(err => {
                        logger.error(err);
                        res.status(500).send({error: err});
                    });
                }
                else {
                    res.status(500).send({error: 'Missing parameter'})
                }

            })
            .get('/state', function(req, res) {

                // Gets the current state of the bot.
                exchange
                    .getState()
                    .then(state => {
                        res.status(200).send({data: state})
                    })
                    .catch(err => {
                        logger.error(err);
                        res.status(500).send({error: err});
                    });
            })
            .get('/balance', function(req, res) {

                // Gets the current state of the bot.
                exchange
                    .getBalance()
                    .then(balance => res.status(200).send({data: balance}))
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