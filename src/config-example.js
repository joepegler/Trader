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
        installments: 3,
        topupOffset: 5,
        timeframe: {
            duration: '5m',
            ms: 1000 * 60 * 5
        },
        maxLookback: 100
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