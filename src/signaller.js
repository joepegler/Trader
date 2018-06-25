module.exports = (function() {

    "use strict";

    const _ = require('lodash');
    const moment = require('moment');
    const tulind = require('tulind');

    let exchange, logger, indicatorOptions;

    function init(_exchange, _logger, _indicatorOptions){
        return new Promise((resolve, reject) => {
            exchange = _exchange;
            logger = _logger;
            indicatorOptions = _indicatorOptions;
            resolve('signaller initiated');
        })
    }

    function _getDataSets(pair, timeframe, candles){
        return new Promise((resolve, reject) => {
            let marketData = { ts:[], open:[], close: [], high: [], low: [], volume: [] };
            exchange.getCandles(pair, timeframe, candles).then(candles => {
                candles.forEach(ochlvArr => {
                    marketData.open.push(ochlvArr[1]);
                    marketData.close.push(ochlvArr[2]);
                    marketData.high.push(ochlvArr[3]);
                    marketData.low.push(ochlvArr[4]);
                    marketData.volume.push(ochlvArr[5]);
                });
                logger.log('Candles: ' + candles.length + ' starting on ' + moment(_.last(candles)[0]).format('YY-MM-DD HH:mm') + ' @ ' + _.last(candles)[2] + ' and ending on ' + moment(_.first(candles)[0]).format('YY-MM-DD HH:mm') + ' @ ' + _.first(candles)[2]);
                resolve(marketData);
            }).catch(reject);
        })
    }

    let rsi = function(marketData, len){
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

    let ema = function(marketData, len){
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

    function getSignal(pair, timeframe, candles){
        return _getDataSets(pair, timeframe, candles).then(marketData => {
            let indicators = [ema(marketData, 8), ema(marketData, 13), ema(marketData, 21), ema(marketData, 34), ema(marketData, 55), rsi(marketData, 14)];
            return Promise.all(indicators).then(indctrs => {
                let ema8 = indctrs[0];
                let ema13 = indctrs[1];
                let ema21 = indctrs[2];
                let ema34 = indctrs[3];
                let ema55 = indctrs[4];
                let rsi = indctrs[5];
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

                let long = EMALongEntry && RSIBullEntry;
                let short = EMABearEntry && RSIBearEntry;
                let closeLong = RSIBullExit || EMABullExit;
                let closeShort = RSIBearExit || EMABearExit;

                let signal = {long, short, closeLong, closeShort};

                return signal;
            });
        });
    }

    return {
        init: init,
        getSignal: getSignal
    }

})();