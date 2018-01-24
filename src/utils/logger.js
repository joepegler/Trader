module.exports = (function() {
    "use strict";

    const moment = require('moment');
    const fs = require('fs');
    const telegram = require('./telegram');

    const logger = {
        init: exchange => {
            telegram.init(exchange);
        },
        log: (messageOne, messageTwo) => {
            let msg = '\n[' + moment(new Date()).format('DD-MM-YY HH:mm:ss') + '] ';
            if (typeof messageOne === 'object') {
                msg += JSON.stringify(messageOne, null, 2);
            }
            else {
                msg += messageOne;
            }
            fs.appendFileSync('./logfile.txt', msg);
            msg = msg.replace('\n', '');
            telegram.sendMessage(msg);
            console.log(msg);
            if (messageTwo) logger.log(messageTwo);
        },
        error: (errorOne, errorTwo) => {
            let msg = '\n[' + moment(new Date()).format('DD-MM-YY HH:mm:ss') + '] ERROR - ';
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
            fs.appendFileSync('./logfile.txt', msg);
            msg = msg.replace('\n', '');
            telegram.sendMessage(msg);
            console.error(msg);
            if (errorTwo) logger.err(errorTwo);
        },
    };

    return logger;

}());
