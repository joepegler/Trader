module.exports = (function() {
    "use strict";

    const TelegramBot = require('node-telegram-bot-api');

    const key = '438280769:AAEyepg0q0nVxZf6Kr__whljKIW_033vmKI';
    const id = -237675778;
    let bot = new TelegramBot(key, { polling: true });

    let respond = (message) => {
        if (typeof message === 'object') message = JSON.stringify(message, null, 2);
        bot.sendMessage(id, message)
    };

    return {
        init: ( exchange ) => {
            return new Promise((resolve) => {
                bot.on("text", (message) => {
                    if (id === message.chat.id) {
                        let command = message.text.slice(0, message.text.indexOf("@")).substring(1);
                        switch(command){
                            case 'buy':
                                exchange.trade('ETHBTC', 'buy').then(respond).catch(respond);
                                break;
                            case 'sell':
                                exchange.trade('ETHBTC', 'sell').then(respond).catch(respond);
                                break;
                            case 'exit':
                                exchange.exit().then(respond).catch(respond);
                                break;
                            case 'state':
                                exchange.getState().then(respond).catch(respond);
                                break
                        }
                    }
                });
                resolve();
            });
        },
        sendMessage: respond
    };

}());
