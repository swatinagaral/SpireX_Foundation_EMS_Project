// Usage: throw httpError(400, "Message")
module.exports = (status, message) => Object.assign(new Error(message), { status });
