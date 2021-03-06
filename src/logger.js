module.exports = (function() {
    "use strict";

    const moment = require('moment');
    const Promise = require('promise');
    const fs = require('fs');

    let io, textFile, telegram;

    const logger = {
        init: (_io, txtFile, tlgrm) => {
            return new Promise((resolve) => {
                if (_io) io = _io;
                textFile = txtFile;
                if (tlgrm) telegram = tlgrm;
                resolve('Initiated logger');
            });
        },
        log: (messageOne, messageTwo, important) => {
            let msg = '';
            if (typeof messageOne === 'object') {
                msg += JSON.stringify(messageOne, null, 2);
            }
            else {
                msg += messageOne;
            }
            textFile && fs.appendFileSync('./' + textFile + '.txt', '\n[' + moment(new Date()).format('DD-MM-YY HH:mm:ss') + ']' + msg);
            msg = msg.replace('\n', '');
            console.log(msg);
            io && io.emit('message', msg);
            important && telegram && telegram.sendMessage(msg);
            if (messageTwo) logger.log(messageTwo, null, important);
        },
        error: (errorOne, errorTwo) => {
            let msg = 'ERROR - ';
            if (typeof errorOne === 'object') {
                if (errorOne instanceof Error) {
                    msg += errorOne.message;
                }
                else {
                    msg += JSON.stringify(errorOne, null, 2);
                }
            }
            else {
                msg += errorOne;
            }
            textFile && fs.appendFileSync('./' + textFile + '.txt', '\n[' + moment(new Date()).format('DD-MM-YY HH:mm:ss') + '] ' + msg);
            msg = msg.replace('\n', '');
            console.error(msg);
            io && io.emit('message', msg);
            telegram && telegram.sendMessage(msg);
            if (errorTwo) logger.err(errorTwo);
        },
    };

    return logger;

}());
