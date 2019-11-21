class ValueError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValueError";
    console.log("EXCEPTION: " + this.name + " MESSAGE: " + this.message);
  }
}

class UnImplementedMethodException extends Error {
  constructor(message) {
    super(message);
    this.name = "UnImplementedMethod";
    console.log("EXCEPTION: " + this.name + " MESSAGE: " + this.message);
  }
}

class IllegalArgumentException extends Error {
  constructor(message, argument) {
    super(message);
    this.name = "IllegalArgument";
    this.argument = argument;
    console.log("EXCEPTION: " + this.name + " MESSAGE: " + this.message);
  }
}

class IllegalStateException extends Error {
  constructor(message) {
    super(message);
    this.name = "IllegalState";
    console.log("EXCEPTION: " + this.name + " MESSAGE: " + this.message);
  }
}

class IllegalJsonException extends Error {
  constructor(message, args) {
    super(message);
    this.name = "IllegalState";
    this.causeException = args.causeException;
    this.originalJsonString = args.originalJsonString;
    console.log(
      "EXCEPTION: " +
        this.name +
        " MESSAGE: " +
        this.message +
        " cause: " +
        this.causeException
    );
  }
}

export {
  UnImplementedMethodException,
  IllegalArgumentException,
  IllegalStateException,
  IllegalJsonException,
  ValueError
};
