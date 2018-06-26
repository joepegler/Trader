module.exports = (function() {

    "use strict";

    const _ = require('lodash');
    const moment = require('moment');
    const tulind = require('tulind');
    const sequence = require('promise-sequence');

    let exchange, logger, indicatorOptions, marketData = { ts:[], open:[], close: [], high: [], low: [], volume: [] };

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

    let rsi = function(len, offset){
        return new Promise((resolve, reject) => {
            tulind.indicators.rsi.indicator([marketData.close], [len], function (err, results) {
                if (!err) {
                    let index = !offset ? (results[0].length - 1) : (results[0].length - 1 - offset);
                    let result = parseFloat(results[0][index].toFixed(2));
                    resolve(result);
                }
                else {
                    reject(err)
                }
            });
        });
    };

    let ema = function(len, offset){
        return new Promise((resolve, reject) => {
            tulind.indicators.ema.indicator([marketData.close], [len], function (err, results) {
                if (!err) {
                    let index = !offset ? (results[0].length - 1) : (results[0].length - 1 - offset);
                    let result = parseFloat(results[0][index].toFixed(2));
                    resolve(result);
                }
                else {
                    reject(err);
                }
            });
        });
    };

    function getSignal(pair, timeframe, candles){
        return _getDataSets(pair, timeframe, candles).then(marketData => {
            let indicators = [
                ema(8),
                ema(13),
                ema(21),
                ema(34),
                ema(55),
                ema(8, indicatorOptions.topupOffset),
                ema(13, indicatorOptions.topupOffset),
                ema(21, indicatorOptions.topupOffset),
                ema(34, indicatorOptions.topupOffset),
                ema(55, indicatorOptions.topupOffset),
                rsi(14),
                rsi(14, indicatorOptions.topupOffset)
            ];
            return sequence(indicators).then(indctrs => {
                let ema8 = indctrs[0];
                let ema13 = indctrs[1];
                let ema21 = indctrs[2];
                let ema34 = indctrs[3];
                let ema55 = indctrs[4];
                let ema8Offset = indctrs[5];
                let ema13Offset = indctrs[6];
                let ema21Offset = indctrs[7];
                let ema34Offset = indctrs[8];
                let ema55Offset = indctrs[9];
                let rsi = indctrs[10];
                let rsiOffset = indctrs[11];
                //EMA
                let EMALongEntry = ema8 > ema13 && ema13 > ema21 && ema21 > ema34 && ema34 > ema55;
                let EMABearEntry = ema8 < ema13 && ema13 < ema21 && ema21 < ema34 && ema34 < ema55;
                let EMABullExit = ema13 < ema21;
                let EMABearExit = ema13 > ema21;
                let EMABullAddon = ema8 > ema8Offset && ema13 > ema13Offset && ema21 > ema21Offset && ema34 > ema34Offset && ema55 > ema55Offset && ((ema8 - ema55) > (ema8Offset - ema55Offset));
                let EMABearAddon = ema8 < ema8Offset && ema13 < ema13Offset && ema21 < ema21Offset && ema34 < ema34Offset && ema55 < ema55Offset && ((ema55 - ema8) > (ema55Offset - ema8Offset));

                //RSI
                let RSIBullEntry = rsi > 30 && rsi < 70;
                let RSIBearEntry = rsi > 30 && rsi < 70;
                let RSIBullExit = rsi >= 70;
                let RSIBearExit = rsi <= 30;
                let RSIBearAddon = rsi < rsiOffset;
                let RSIBullAddon = rsi > rsiOffset;

                let long = EMALongEntry && RSIBullEntry;
                let short = EMABearEntry && RSIBearEntry;
                let closeLong = RSIBullExit || EMABullExit;
                let closeShort = RSIBearExit || EMABearExit;
                let addToLong = EMABullAddon && RSIBullAddon;
                let addToShort = EMABearAddon && RSIBearAddon;

                let signal = { long, short, closeLong, closeShort, addToLong, addToShort };

                return signal;
            });
        });
    }

    return {
        init: init,
        getSignal: getSignal
    }

})();