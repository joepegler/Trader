module.exports = (function() {
    "use strict";

    const express   = require('express');
    const Promise   = require('promise');
    const app       = express();

    let config = require('./config');
    let features = {
        server:     null,
        io:         null,
        telegram:   null,
        logger:     null,
        exchange:   null,
        terminal:   null,
        toolkit:    null
    };

    (function init(){

        if(process.argv[2] === 'ui'){
            initIo()
                .then()
                .then(initLogger)
                .then(initExchange)
                .then(initToolkit)
                .then(initUi)
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
        else {
            initIo()
                .then()
                .then(initTelegram)
                .then(initLogger)
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

    function initExchange(){
        console.info('initExchange');
        return new Promise((resolve, reject) => {
            let exchangeOpts = config.exchange;
            if (exchangeOpts) {
                let exchangeName = exchangeOpts.exchangeName;
                let configKeys = exchangeOpts.apiKeys[exchangeName];
                let pairs = config.exchange.enabledPairs;
                let asMaker = config.exchange.asMaker;
                features.exchange = require('./' + exchangeName);
                features.exchange.init(pairs, configKeys, features.logger, asMaker).then(resolve).catch(reject);
            }
            else {
                resolve('Missing exchange options from npm command');
            }
        })
    }

    function initTelegramActions(){
        console.info('initTelegramActions');
        return new Promise((resolve) => {
            features.telegram.initActions(features.exchange).then(resolve);
        })
    }

    function initToolkit(){
        console.info('initToolkit');
        return new Promise((resolve, reject) => {
            features.toolkit = require('./toolkit');
            features.toolkit.init(features.exchange).then(resolve).catch(reject);
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
                api.init(app, port, authToken, features.exchange, features.logger).then(resolve).catch(reject);
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
            // let ioOpts = config.io;
            if (uiOpts) {
                let uiPort = uiOpts.port;
                let directory = uiOpts.directory;
                let openBrowser = uiOpts.openBrowser;
                let ui = require('./ui');
                ui.init(features.server, app, uiPort, features.io, features.toolkit, directory, openBrowser, features.logger).then(resolve).catch(reject);
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