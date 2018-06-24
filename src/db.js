module.exports = (function(){

    'use strict';

    const Promise = require('promise');
    const _ = require('lodash');
    const { Client } = require('pg');
    let client;

    function _saveSignal(amount, pair){
        return new Promise((resolve, reject) => {
            const text = 'INSERT INTO signals(side, amount, ts, pair, done) VALUES($1, $2, $3, $4, $5) RETURNING *';
            const values = [parseFloat(amount) > 0 ? 'buy' : 'sell', amount.toString(), 'NOW()', pair, 'false'];
            client.query(text, values).then(dbResponse => resolve(values)).catch(reject);
        });
    }

    function _getUntradedSignals(){
        return new Promise((resolve, reject) => {
            const text = 'SELECT * FROM signals WHERE done = FALSE';
            client.query(text).then(res => resolve(_.uniqBy(res.rows.reverse(), 'pair'))).catch(reject);
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
        markSignalDone: _markSignalDone,
        getUntradedSignals: _getUntradedSignals,
        saveTrade: _saveTrade,
        init: _init
    }

})();