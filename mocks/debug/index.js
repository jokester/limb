const enabledPrefix = [
  name => name.startsWith('engine') || name.startsWith('socket'),
];
module.exports =
  name =>
  (...args) => {
    if (enabledPrefix.some(f => f(name))) {
      console.debug(new Date(), 'DEBUG', name, ...args);
    }
  };
