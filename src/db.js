module.exports = (function(){

    'use strict';

    const Promise = require('promise');
    const _ = require('lodash');
    const { Client } = require('pg');
    let client;

    function _saveSignal(amount, pair, positionId){
        return new Promise((resolve, reject) => {
            const text = 'INSERT INTO signals(side, amount, ts, pair, done, position) VALUES($1, $2, $3, $4, $5, $6) RETURNING *';
            const values = [parseFloat(amount) > 0 ? 'buy' : 'sell', amount.toString(), 'NOW()', pair, 'false', positionId];
            client.query(text, values).then(dbResponse => {
                resolve(values)
            }).catch(reject);
        });
    }

    function _savePosition(installments, size, pair, side){
        return new Promise((resolve, reject) => {
            const text = 'INSERT INTO positions(installments, size, pair, ts, done, side) VALUES($1, $2, $3, $4, $5, $6) RETURNING id';
            const values = [installments, size, pair, 'NOW()', 'false', side];
            client.query(text, values).then(dbResponse => {
                let positionId = dbResponse.rows[0].id;
                let amount = side === 'sell' ? -size : size;
                _saveSignal(amount, pair, positionId).then(resolve).catch(reject);
            }).catch(reject);
        });
    }

    function _getUntradedSignals(pair){
        return new Promise((resolve, reject) => {
            const text = 'SELECT * FROM signals WHERE done = FALSE';
            client.query(text).then(res => {
                let signals = _.uniqBy(res.rows.reverse(), 'pair');
                if (pair){
                    signals = signals.filter(signal => { return signal.pair === pair });
                }
                resolve(signals)
            }).catch(reject);
        });
    }

    function _getSignalsByPositionId(positionId){
        return new Promise((resolve, reject) => {
            const text = 'SELECT * FROM signals WHERE position = ' + positionId;
            client.query(text).then(res => { resolve(res.rows) }).catch(reject);
        });
    }

    function _getOpenPositions(pair){
        return new Promise((resolve, reject) => {
            const text = 'SELECT * FROM positions WHERE done = FALSE';
            client.query(text).then(res => {
                let openPositions = _.uniqBy(res.rows.reverse(), 'pair');
                if (pair){
                    openPositions.filter(position => { return position.pair === pair });
                }
                resolve(openPositions);
            }).catch(reject);
        });
    }

    function _markSignalDone(signalId){
        return new Promise((resolve, reject) => {
            const text = 'UPDATE signals SET done = TRUE WHERE ID = $1';
            client.query(text, [signalId]).then(dbResponse => resolve(signalId)).catch(reject);
        });
    }

    function _saveTrade(trade){
        return new Promise((resolve, reject) => {
            const text = 'INSERT INTO trades(id, signal, pair, ts, amount, side) VALUES($1, $2, $3, $4, $5, $6) RETURNING *';
            const values = Object.values(trade);
            client.query(text, values).then(() => {
                _markSignalDone(trade.signal).then(() => resolve(trade)).catch(reject);
            });
        });
    }

    function _init(dbConfig){
        return new Promise((resolve, reject) => {
            client = new Client(dbConfig);
            client.connect();
            resolve('Connected to db');
        })
    }

    return {
        saveSignal: _saveSignal,
        savePosition: _savePosition,
        markSignalDone: _markSignalDone,
        getUntradedSignals: _getUntradedSignals,
        getOpenPositions: _getOpenPositions,
        getSignalsByPositionId: _getSignalsByPositionId,
        saveTrade: _saveTrade,
        init: _init
    }

})();