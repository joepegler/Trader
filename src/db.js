module.exports = (function(){

    'use strict';

    const Promise = require('promise');
    const _ = require('lodash');
    const { Client } = require('pg');
    let client;

    function _saveOrder(amount, pair, positionId, side){
        return new Promise((resolve, reject) => {
            const text = 'INSERT INTO orders(side, amount, ts, pair, done, position_id) VALUES($1, $2, $3, $4, $5, $6) RETURNING *';
            const values = [side, amount.toString(), 'NOW()', pair, 'false', positionId];
            client.query(text, values).then(() => {
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
                let amount = parseFloat(size);
                _saveOrder(amount, pair, positionId, side).then(resolve).catch(reject);
            }).catch(reject);
        });
    }

    function _getIncompleteOrders(pair){
        return new Promise((resolve, reject) => {
            const text = 'SELECT * FROM orders WHERE done = FALSE';
            client.query(text).then(res => {
                let orders = _.uniqBy(res.rows.reverse(), 'pair');
                if (pair){
                    orders = orders.filter(order => { return order.pair === pair });
                }
                resolve(orders)
            }).catch(reject);
        });
    }

    function _getOrdersByPositionId(positionId){
        return new Promise((resolve, reject) => {
            const text = 'SELECT * FROM orders WHERE position_id = ' + positionId;
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

    function _markOrderDone(orderId){
        return new Promise((resolve, reject) => {
            const text = 'UPDATE orders SET done = TRUE WHERE ID = $1';
            client.query(text, [orderId]).then(dbResponse => resolve(orderId)).catch(reject);
        });
    }

    function _markPositionDone(positionId, profit){
        return new Promise((resolve, reject) => {
            const text = 'UPDATE positions SET done = TRUE, profit = $1 WHERE ID = $2';
            client.query(text, [profit, positionId]).then(dbResponse => resolve(positionId)).catch(reject);
        });
    }

    function _saveTrade(trade){
        return new Promise((resolve, reject) => {
            const text = 'INSERT INTO trades(id, order_id, pair, ts, amount, side) VALUES($1, $2, $3, $4, $5, $6) RETURNING *';
            const values = Object.values(trade);
            client.query(text, values).then(() => {
                _markOrderDone(trade['order_id']).then(() => resolve(trade)).catch(reject);
            });
        });
    }

    function _init(dbConfig){
        return new Promise((resolve) => {
            client = new Client(dbConfig);
            client.connect();
            resolve('Connected to db');
        })
    }

    return {
        saveOrder: _saveOrder,
        savePosition: _savePosition,
        markOrderDone: _markOrderDone,
        markPositionDone: _markPositionDone,
        getIncompleteOrders: _getIncompleteOrders,
        getOpenPositions: _getOpenPositions,
        getOrdersByPositionId: _getOrdersByPositionId,
        saveTrade: _saveTrade,
        init: _init
    }

})();