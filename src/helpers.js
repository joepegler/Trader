module.exports = (function() {

    return {
        serial: promises => {
            return Promise((resolve, reject) => {
                promises.reduce((memo, promise) => {
                    promise.then(memo.push)
                }, []);
            })
        }
    }
})();