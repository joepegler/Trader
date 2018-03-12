module.exports = (function() {

    "use strict";

    const opn       = require('opn');
    const express   = require('express');
    const path      = require('path');

    return {
        init: function(server, app, uiPort, io, toolkit, dir, openBrowser, logger){
            return new Promise((resolve) => {
                server.listen(uiPort);
                app.use(express.static(path.join(__dirname, '/' + dir)));
                openBrowser && opn('http://localhost:' + uiPort);
                io.on('connection', client => {
                    client.on('action', (action) => {
                        console.info('action: ' + action);
                        toolkit.performAction(action).then(logger.log).catch(logger.log);
                    })
                });
                resolve('Initiated the ui on port: ' + uiPort);
            });
        }
    }

})();
