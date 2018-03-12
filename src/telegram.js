module.exports = (function() {
    "use strict";

    const Promise = require('promise');
    const TelegramBot = require('node-telegram-bot-api');

    let bot, id;

    return {
        init: ( key, _id ) => {
            return new Promise((resolve) => {
                id = _id;
                bot = new TelegramBot(key);
                resolve('Initiated telegram bot with key: ' + key + ' and id: ' + _id);
            });
        },
        sendMessage: (message) => {
            if (typeof message === 'object') message = JSON.stringify(message, null, 2);
            bot.sendMessage(id, message);
        }
    };

}());
