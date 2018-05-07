module.exports = (function() {

    "use strict";

    const prompt = require('prompt');

    let exchange, logger, toolkit;

    function init(_exchange, _logger, _toolkit){
        return new Promise((resolve) => {
            toolkit = _toolkit;
            exchange = _exchange;
            logger = _logger;
            prompt.start();
            getInput();
        });
    }

    function getInput(result){

        if(result) logger.log(result);
        console.log(`Pick an action: [b]alances, [buy], [sell], [s]tate, [o]rders, [p]ositions`);

        // Get user input
        prompt.get(['action'], function (err, res) {
            console.log('\n');
            if(!err && res.action) toolkit.performAction(res.action).then(getInput).catch(getInput);
        });

    }

    return {
        init: init,
        getInput: getInput
    }

})();
