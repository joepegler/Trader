module.exports = (function() {
    "use strict";

    const Promise = require('promise');
    const TelegramBot = require('node-telegram-bot-api');

    let bot, id, tlgrm = {
        init: ( key, _id ) => {
            return new Promise((resolve) => {
                id = _id;
                bot = new TelegramBot(key, { polling: true });
                resolve('Initiated telegram bot with key: ' + key + ' and id: ' + _id);
            });
        },
        sendMessage: (message) => {
            if (typeof message === 'object') message = JSON.stringify(message, null, 2);
            bot.sendMessage(id, message);
        },
        initActions: (exchange) => {
            return new Promise((resolve) => {
                bot.on("text", (message) => {
                    if (id === message.chat.id) {
                        let command = message.text.slice(0, message.text.indexOf("@")).substring(1);
                        switch (command) {
                            case 'state':
                                exchange.getState().then(tlgrm.sendMessage).catch(tlgrm.sendMessage);
                                break;
                            case 'resolve':
                                exchange.resolvePendingOrders().then(tlgrm.sendMessage).catch(tlgrm.sendMessage);
                                break;
                        }
                    }
                });
                resolve('Activated telegram actions');
            });
        }
    };

    return tlgrm;

}());
