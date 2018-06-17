module.exports = (function() {

    "use strict";

    const prompt = require('prompt');
    const _ = require('lodash');
    const moment = require('moment');
    const tulind = require('tulind');

    let exchange, logger, marketData = { ts:[], open:[], close: [], high: [], low: [], volume: [] }, INTERVAL_TIMEOUT = 5 * 60 * 1000;

    function init(_exchange, _logger){
        return new Promise((resolve, reject) => {
            exchange = _exchange;
            logger = _logger;
            getDataSets().then(getIndicators);
            // setInterval(interval, INTERVAL_TIMEOUT);
            resolve('Initiated strategy');
        });
    }

    function getDataSets(){
        return new Promise((resolve, reject) => {
            exchange.getCandles('BTCUSD', '1h', 55).then(candles => {
                candles.forEach(ochlvArr => {
                    marketData.open.push(ochlvArr[1]);
                    marketData.close.push(ochlvArr[2]);
                    marketData.high.push(ochlvArr[3]);
                    marketData.low.push(ochlvArr[4]);
                    marketData.volume.push(ochlvArr[5]);
                });
                logger.log('Candles: ' + candles.length + ' starting on ' + moment(_.last(candles)[0]).format('YY-MM-DD HH:mm') + ' @ ' + _.last(candles)[2] + ' and ending on ' + moment(_.first(candles)[0]).format('YY-MM-DD HH:mm') + ' @ ' + _.first(candles)[2]);
                resolve(candles);
            }).catch(reject);
        })
    }

    let rsi = function(len){
        return new Promise((resolve, reject) => {
            tulind.indicators.rsi.indicator([marketData.close], [len], function (err, results) {
                if (!err) {
                    resolve(parseFloat(_.last(results[0]).toFixed(2)));
                }
                else {
                    reject(err)
                }
            });
        });
    };

    let ema = function(len){
        return new Promise((resolve, reject) => {
            tulind.indicators.ema.indicator([marketData.close], [len], function (err, results) {
                if (!err) {
                    resolve(parseFloat(_.last(results[0]).toFixed(2)));
                }
                else {
                    reject(err);
                }
            });
        });
    };

    function getIndicators(){

        logger.log('getIndicators');

        let indicators = [ema(8), ema(13), ema(21), ema(34), ema(55), rsi(14)];

        Promise.all(indicators).then(indctrs => {

            let ema8 = indctrs[0];
            let ema13 = indctrs[1];
            let ema21 = indctrs[2];
            let ema34 = indctrs[3];
            let ema55 = indctrs[4];
            let rsi = indctrs[5];

            logger.log(indctrs);

            //EMA
            let EMALongEntry = ema8 > ema13 && ema13 > ema21 && ema21 > ema34 && ema34 > ema55;
            let EMABearEntry = ema8 < ema13 && ema13 < ema21 && ema21 < ema34 && ema34 < ema55;

            let EMABullExit = ema13 < ema21;
            let EMABearExit = ema13 > ema21;

            //RSI
            let RSIBullEntry = rsi > 30 && rsi < 70;
            let RSIBearEntry = rsi > 30 && rsi < 70;

            let RSIBullExit = rsi > 70;
            let RSIBearExit = rsi < 30;

        }).catch(logger.error)

    }

    return {
        init: init,
        ema: ema,
        rsi: rsi
    }

})();