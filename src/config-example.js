module.exports = {
    io: {
        ioPort: 0,
    },
    telegram: {
        key: 'KEY',
        id: 0
    },
    logger: {
        txtFile: 'log'
    },
    exchange: {
        exchangeName: 'gdax',
        apiKeys: {
            bitfinex: {
                rest: {
                    key: 'XXX',
                    secret: 'XXX'
                },
                websocket: {
                    key: 'XXX',
                    secret: 'XXX'
                }
            }
        },
        enabledPairs: ['ETHBTC', 'BTCUSD', 'LTCBTC', 'XRPBTC', 'XMRBTC', 'DSHBTC'],
        asMaker: true
    },
    strategy : {
        pyramiding: 3,
        qty_value: 33,
        qty_type: 'percentage'
    },
    api: {
        port: 0,
        authToken: 'XXX'
    },
    terminal: {
        port: 8000
    },
    ui: {
        directory: 'www',
        openBrowser: true
    },
    db: {
        user: 'xx',
        host: 'xxx',
        database: 'xxx',
        password: 'xxx',
        port: 5432
    }
};