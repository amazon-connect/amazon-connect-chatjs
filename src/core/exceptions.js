class ValueError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValueError";
    }
}

class UnImplementedMethodException extends Error {
    constructor(message) {
        super(message);
        this.name = "UnImplementedMethod";
    }
}

class IllegalArgumentException extends Error {
    constructor(message, argument) {
        super(message);
        this.name = "IllegalArgument";
        this.argument = argument;
    }
}

class IllegalStateException extends Error {
    constructor(message) {
        super(message);
        this.name = "IllegalState";
    }
}

class IllegalJsonException extends Error {
    constructor(message, args) {
        super(message);
        this.name = "IllegalState";
        this.causeException = args.causeException;
        this.originalJsonString = args.originalJsonString;
    }
}

export {
    UnImplementedMethodException,
    IllegalArgumentException,
    IllegalStateException,
    IllegalJsonException,
    ValueError
};
