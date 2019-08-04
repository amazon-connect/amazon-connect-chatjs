// Add `finally()` to `Promise.prototype`
Promise.prototype.finally = function(onFinally) {
  return this.then(
    /* onFulfilled */
    res => Promise.resolve(onFinally()).then(() => res),
    /* onRejected */
    err => Promise.resolve(onFinally()).then(() => { throw err; })
  );
};

