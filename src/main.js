module.exports = (function() {
    "use strict";

    const express   = require('express');
    const Promise   = require('promise');
    const app       = express();

    let config = require('./config');
    let features = {
        server:     null,
        io:         null,
        db:         null,
        telegram:   null,
        logger:     null,
        exchange:   null,
        terminal:   null,
        toolkit:    null,
        signaller:  null,
        strategy:   null
    };

    (function init(){

        let commandLineArg = process.argv[2];

        if(commandLineArg === 'ui'){
            initIo()
                .then()
                .then(initLogger)
                .then(initDb)
                .then(initExchange)
                .then(initToolkit)
                .then(initUi)
                .then(console.log)
                .catch(console.error)
        }
        if(commandLineArg === 'test'){
            initIo()
                .then()
                .then(initTelegram)
                .then(initLogger)
                .then(initDb)
                .then(initExchange)
                .then(initSignaller)
                .then(initStrategy)
                .then(console.log)
                .catch(console.error)
        }
        else if(process.argv[2] === 'dev') {
            initIo()
                .then()
                .then(initLogger)
                .then(initExchange)
                .then(initToolkit)
                .then(initTerminal)
                .then(console.log)
                .catch(console.error)
        }
        else if(commandLineArg === 'apitest') {
            initIo()
                .then()
                .then(initLogger)
                .then(initDb)
                .then(initExchange)
                .then(initApi)
                .then(console.log)
                .catch(console.error)
        }
        else {
            initIo()
                .then()
                .then(initTelegram)
                .then(initLogger)
                .then(initDb)
                .then(initExchange)
                .then(initTelegramActions)
                .then(initApi)
                .then(console.log)
                .catch(console.error)
        }

    })();

    function initIo(){
        return new Promise((resolve) => {
            let ioOpts = config.io;
            if (ioOpts){
                let ioPort = ioOpts.ioPort;
                features.server = require('http').createServer(app);
                features.io = require('socket.io')(features.server);
                features.server.listen(ioPort);
                resolve('Listening to server on port ' + ioPort);
            }
            else {
                resolve('Missing io options from npm command');
            }
        })
    }

    function initTelegram(){
        return new Promise((resolve, reject) => {
            let telegramOpts = config.telegram;
            if (telegramOpts) {
                let key = telegramOpts.key;
                let id = telegramOpts.id;
                features.telegram = require('./telegram');
                features.telegram.init(key, id).then(resolve).catch(reject);
            }
            else {
                resolve('Missing telegram options from npm command');
            }
        })
    }

    function initLogger(){
        return new Promise((resolve, reject) => {
            let loggerOpts = config.logger;
            if (loggerOpts) {
                let txtFile = loggerOpts.txtFile;
                features.logger = require('./logger');
                features.logger.init(features.io, txtFile, features.telegram).then(resolve).catch(reject);
            }
            else {
                resolve('Missing logger options from npm command');
            }
        })
    }

    function initDb(){
        return new Promise((resolve, reject) => {
            let dbOpts = config.db;
            if (dbOpts){
                features.db = require('./db');
                features.db.init(dbOpts).then(resolve).catch(reject);
            }
            else {
                resolve('Missing dbOpts options');
            }
        })
    }

    function initExchange(){
        console.info('initExchange');
        return new Promise((resolve, reject) => {
            let exchangeOpts = config.exchange;
            if (exchangeOpts) {
                let exchangeName = exchangeOpts.exchangeName;
                let configKeys = exchangeOpts.apiKeys[exchangeName];
                features.exchange = require('./' + exchangeName);
                features.exchange.init(configKeys, features.logger, features.db).then(resolve).catch(reject);
            }
            else {
                reject('Missing exchange options from npm command');
            }
        })
    }

    function initSignaller(){
        console.info('initSignaller');
        let stratOpts = config.strategy;
        return new Promise((resolve, reject) => {
            features.signaller = require('./signaller');
            features.signaller.init(features.exchange, features.logger, stratOpts).then(resolve).catch(reject);
        });
    }

    function initStrategy(){
        console.info('initStrategy');
        let stratOpts = config.strategy;
        return new Promise((resolve, reject) => {
            features.strategy = require('./strategy');
            features.strategy.init(features.exchange, features.logger, stratOpts, features.signaller, features.db).then(resolve).catch(reject);
        });
    }

    function initTelegramActions(){
        console.info('initTelegramActions');
        return features.telegram.initActions(features.exchange);
    }

    function initToolkit(){
        console.info('initToolkit');
        return new Promise((resolve, reject) => {
            features.toolkit = require('./toolkit');
            features.toolkit.init(features.exchange, features.db).then(resolve).catch(reject);
            resolve('Initiated toolkit');
        })
    }

    function initApi(){
        console.info('initApi');
        return new Promise((resolve, reject) => {
            let apiOpts = config.api;
            if (apiOpts) {
                let port = apiOpts.port;
                let authToken = apiOpts.authToken;
                let api = require('./api');
                api.init(app, port, authToken, features.exchange, features.logger, features.db).then(resolve).catch(reject);
            }
            else {
                resolve('Missing api options from npm command');
            }
        })
    }

    function initUi(){
        console.info('initUi');
        return new Promise((resolve, reject) => {
            let uiOpts = config.ui;
            if (uiOpts) {
                let uiPort = uiOpts.port;
                let directory = uiOpts.directory;
                let openBrowser = uiOpts.openBrowser;
                let ui = require('./ui');
                let newServer = require('http').createServer(app);
                ui.init(newServer, app, uiPort, features.io, features.toolkit, directory, openBrowser, features.logger).then(resolve).catch(reject);
            }
            else {
                resolve('Missing api options from npm command');
            }
        })
    }

    function initTerminal(){
        console.info('initTerminal');
        return new Promise((resolve, reject) => {
            features.terminal = require('./terminal');
            features.terminal.init(features.exchange, features.logger, features.toolkit).then(resolve).catch(reject);
        })
    }

}());