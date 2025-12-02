/**
 * Wraps an async function and passes any errors to the global error handler.
 * @param {Function} fn - The async function to wrap.
 * @returns {Function} - The wrapped function.
 */
module.exports = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
