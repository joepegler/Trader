#Trader

## Local Development configuration
- This project requires [node](https://nodejs.org/en/) to run. It was developed using version 8.9.4. 
- Once installed get the required dependencies with the command: `npm i`
- There is a configuration file that needs to be renamed and supplied with the bitfinex secret/key:
    - `mv src/config-example.js src/exchanges/config.js`
    - `npm start` - Runs the trader with the local endpoint: [http://localhost:8000](http://localhost:8000). This can receive http requests from [this postman project](https://www.getpostman.com/collections/d3ff660f287183be472e) to send actions to bitfinex. A description of the API can be found [here.](https://documenter.getpostman.com/view/877346/swingtrader-local/7TNgXfx)
    - `npm run docs` - Generates code documentation as a static html page.
    - `npm run play` - Runs the playground.js file with a set of quickfire actions you can use to interact with bitfinex.
### Commands    
- **[b]alances** - Gets the available balance quoted in all of the supported pairs
```javascript
[
    {
        pair: 'ETHBTC',
        balance: 192.338,
        tradeable: 480.845
    }
]
```
- **[s]tate** - Gets the current state of the bot
```javascript
    state = {
        "state": "active",
        "balances": [{
            "pair": "ETHBTC",
            "balance": 0.13802080706832412,
            "tradeable": 0.3130893379539062
        }],
        "activePairs": [{
            "pair": "ETHBTC",
            "balance": 0.13802080706832412,
            "side": "buy",
            "positions": [],
            "orders": []
        }]
    }
```
- **[o]rders** - Gets all open orders
```javascript
    [{
         "id":5243424763,
         "pair":"ETHBTC",
         "price": 0.043615,
         "side":"buy",
         "remaining_amount": .565
    }]            
```
- **[p]ositions** - Gets all open positions
```javascript
    [{
        "id": "134514333",
        "pair": "ETHBTC",
        "base": 0.089331,
        "amount": 0.13875501,
        "profit": -0.00001565073259794,
        "side": "buy"
    }]
```
- **[buy]** - Places a margin long trade on the ETHBTC pair worth 0.02 ETH at the price of the lowest ask. Returns the current state
- **[sell]** - Places a margin short trade on the ETHBTC pair worth 0.02 ETH at the price of the highest bid. Returns the current state
- **[c]lose** - Closes an open ETHBTC position
- **[e]xit** - Closes all open positions and orders
- **[r]esolve pending orders** - Recursively attempts to re-submit any unfilled open orders

## Server configuration
- [pm2](http://pm2.keymetrics.io/) was used in place of node as an advanced, production process manager for Node.js. Start pm2 with the command: 
    - `pm2 start src/app.js --name trader`