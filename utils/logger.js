module.exports = (function() {
    "use strict";

    const moment = require('moment');
    const TelegramBot = require('node-telegram-bot-api');
    const fs = require('fs');

    const key = '380504145:AAF16WbEqFSaKtP6ZidJE6mxUD9QmU3tePc';
    const id = '-237675778';
    const bot = new TelegramBot(key);

    const logger = {
        log: (messageOne, messageTwo) => {
            let msg = '\n[' + moment(new Date()).format('DD-MM-YY HH:mm:ss') + '] ';
            if (typeof messageOne === 'object') {
                msg += JSON.stringify(messageOne, null, 2);
            }
            else {
                msg += messageOne;
            }
            console.log(msg);
            bot.sendMessage(id, msg);
            fs.appendFileSync('./logfile.txt', msg);
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
            console.error(msg);
            bot.sendMessage(id, msg);
            fs.appendFileSync('./logfile.txt', msg);
            if (errorTwo) logger.err(errorTwo);
        },
    };

    return logger;

}());
