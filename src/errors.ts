export class KeyknoxError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, KeyknoxError.prototype);
  }
}

export class KeyknoxClientError extends KeyknoxError {
  status?: number;
  code?: number;

  constructor(message: string, status?: number, code?: number) {
    super(message);
    Object.setPrototypeOf(this, KeyknoxClientError.prototype);
    this.status = status;
    this.code = code;
  }
}

export class CloudKeyStorageOutOfSyncError extends KeyknoxError {
  constructor() {
    super('CloudKeyStorage is out of sync');
    Object.setPrototypeOf(this, CloudKeyStorageOutOfSyncError.prototype);
  }
}

export class CloudEntryExistsError extends KeyknoxError {
  cloudEntryName: string;

  constructor(cloudEntryName: string) {
    super(`Cloud entry '${cloudEntryName}' already exists`);
    this.cloudEntryName = cloudEntryName;
    Object.setPrototypeOf(this, CloudEntryExistsError.prototype);
  }
}

export class CloudEntryDoesntExistError extends KeyknoxError {
  cloudEntryName: string;

  constructor(cloudEntryName: string) {
    super(`Cloud entry '${cloudEntryName}' doesn't exist`);
    this.cloudEntryName = cloudEntryName;
    Object.setPrototypeOf(this, CloudEntryDoesntExistError.prototype);
  }
}

export class KeyEntryExistsError extends KeyknoxError {
  keyEntryName: string;

  constructor(keyEntryName: string) {
    super(`Key entry '${keyEntryName}' already exists`);
    this.keyEntryName = keyEntryName;
    Object.setPrototypeOf(this, KeyEntryExistsError.prototype);
  }
}

export class KeyEntryDoesntExistError extends KeyknoxError {
  keyEntryName: string;

  constructor(keyEntryName: string) {
    super(`Key entry '${keyEntryName}' doesn't exist`);
    this.keyEntryName = keyEntryName;
    Object.setPrototypeOf(this, KeyEntryDoesntExistError.prototype);
  }
}
