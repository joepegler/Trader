module.exports = (function(){

    'use strict';

    const Promise = require('promise');
    const _ = require('lodash');
    const mysql = require('promise-mysql');
    let connection;

    function _saveOrder(amount, pair, positionId, side){
        return new Promise((resolve, reject) => {
            const text = 'INSERT INTO orders(side, amount, ts, pair, done, position_id) VALUES($1, $2, $3, $4, $5, $6)';
            const values = [side, amount.toString(), 'NOW()', pair, 'false', positionId];
            connection.query(text, values).then(() => {
                let resultQuery = `SELECT * FROM orders WHERE id = LAST_INSERT_ID()`;
                return connection.query(resultQuery);
            }).catch(reject);
        });
    }

    async function _savePositionAndOrder(installments, size, pair, side){
        let savedPositions = await _savePosition(installments, size, pair, side);
        let positionId = savedPositions[0].id;
        let amount = parseFloat(size);
        return await _saveOrder(amount, pair, positionId, side);
    }

    function _savePosition(installments, size, pair, side){
        return new Promise((resolve, reject) => {
            const text = 'INSERT INTO positions(installments, size, pair, ts, done, side) VALUES($1, $2, $3, $4, $5, $6)';
            const values = [installments, size, pair, 'NOW()', 'false', side];
            connection.query(text, values).then(() => {
                let resultQuery = `SELECT LAST_INSERT_ID()`;
                return connection.query(resultQuery);
            }).catch(reject);
        })
    }

    function _getIncompleteOrders(pair){
        return new Promise((resolve, reject) => {
            const text = 'SELECT * FROM orders WHERE done = FALSE';
            connection.query(text).then(rows => {
                let orders = _.uniqBy(rows.reverse(), 'pair');
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
            connection.query(text).then(rows => { resolve(rows) }).catch(reject);
        });
    }

    function _getOpenPositions(pair){
        return new Promise((resolve, reject) => {
            const text = 'SELECT * FROM positions WHERE done = FALSE';
            connection.query(text).then(rows => {
                let openPositions = _.uniqBy(rows.reverse(), 'pair');
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
            connection.query(text, [orderId]).then(dbResponse => resolve(orderId)).catch(reject);
        });
    }

    function _markPositionDone(positionId, profit){
        return new Promise((resolve, reject) => {
            const text = 'UPDATE positions SET done = TRUE, profit = $1 WHERE ID = $2';
            connection.query(text, [profit, positionId]).then(dbResponse => resolve(positionId)).catch(reject);
        });
    }

    function _saveTrade(trade){
        return new Promise((resolve, reject) => {
            const text = 'INSERT INTO trades(id, order_id, pair, ts, amount, side) VALUES($1, $2, $3, $4, $5, $6)';
            const values = Object.values(trade);
            connection.query(text, values).then(() => {
                _markOrderDone(trade['order_id']).then(rows => resolve(trade)).catch(reject);
            });
        });
    }

    function _init(dbConfig){
        return new Promise((resolve, reject) => {
            connection = mysql.createConnection(dbConfig).then(function(conn){
                connection = conn;
                resolve('Connected to db');
            });
        })
    }

    return {
        saveOrder: _saveOrder,
        savePositionAndOrder: _savePositionAndOrder,
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