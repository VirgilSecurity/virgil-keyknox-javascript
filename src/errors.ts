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
    Object.setPrototypeOf(this, KeyknoxError);
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

export class CloudKeyStorageEntryExistsError extends KeyknoxError {
  constructor(entryName: string) {
    super(`Entry '${entryName}' already exists`);
    Object.setPrototypeOf(this, CloudKeyStorageEntryExistsError.prototype);
  }
}

export class CloudKeyStorageEntryDoesntExistError extends KeyknoxError {
  constructor(entryName: string) {
    super(`Entry '${entryName}' doesn't exist`);
    Object.setPrototypeOf(this, CloudKeyStorageEntryDoesntExistError.prototype);
  }
}

export class KeyEntryDoesntExistError extends KeyknoxError {
  constructor(keyEntryName: string) {
    super(`Key entry '${keyEntryName}' doesn't exist`);
    Object.setPrototypeOf(this, KeyEntryDoesntExistError.prototype);
  }
}

export class KeyEntryAlreadyExistsError extends KeyknoxError {
  constructor(keyEntryName: string) {
    super(`Key entry '${keyEntryName}' already exists`);
    Object.setPrototypeOf(this, KeyEntryAlreadyExistsError.prototype);
  }
}
