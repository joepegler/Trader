#Trading configuration

1. Copy sample configuration file and set the secret/key pairs

`mv exchanges/config-example.js exchanges/config.js`

2. Use [nvm](https://github.com/creationix/nvm) to change node version to 8.9.4

`nvm use 8.9.4`

3. Install dependencies

`rm -rf node_modules && npm i`

4. Start pm2 (or node during development)

`pm2 start app.js --name trading`