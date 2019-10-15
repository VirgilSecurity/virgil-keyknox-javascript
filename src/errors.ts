export class KeyknoxError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, KeyknoxError.prototype);
    this.name = 'KeyknoxError';
  }
}

export class KeyknoxClientError extends KeyknoxError {
  status?: number;
  code?: number;

  constructor(message: string, status?: number, code?: number) {
    super(message);
    Object.setPrototypeOf(this, KeyknoxClientError.prototype);
    this.name = 'KeyknoxClientError';
    this.status = status;
    this.code = code;
  }
}

export class CloudKeyStorageOutOfSyncError extends KeyknoxError {
  constructor() {
    super('CloudKeyStorage is out of sync');
    Object.setPrototypeOf(this, CloudKeyStorageOutOfSyncError.prototype);
    this.name = 'CloudKeyStorageOutOfSyncError';
  }
}

export class CloudEntryExistsError extends KeyknoxError {
  cloudEntryName: string;

  constructor(cloudEntryName: string) {
    super(`Cloud entry '${cloudEntryName}' already exists`);
    Object.setPrototypeOf(this, CloudEntryExistsError.prototype);
    this.name = 'CloudEntryExistsError';
    this.cloudEntryName = cloudEntryName;
  }
}

export class CloudEntryDoesntExistError extends KeyknoxError {
  cloudEntryName: string;

  constructor(cloudEntryName: string) {
    super(`Cloud entry '${cloudEntryName}' doesn't exist`);
    Object.setPrototypeOf(this, CloudEntryDoesntExistError.prototype);
    this.name = 'CloudEntryDoesntExistError';
    this.cloudEntryName = cloudEntryName;
  }
}

export class KeyEntryExistsError extends KeyknoxError {
  keyEntryName: string;

  constructor(keyEntryName: string) {
    super(`Key entry '${keyEntryName}' already exists`);
    this.name = 'KeyEntryExistsError';
    this.keyEntryName = keyEntryName;
  }
}

export class KeyEntryDoesntExistError extends KeyknoxError {
  keyEntryName: string;

  constructor(keyEntryName: string) {
    super(`Key entry '${keyEntryName}' doesn't exist`);
    Object.setPrototypeOf(this, KeyEntryDoesntExistError.prototype);
    this.name = 'KeyEntryDoesntExistError';
    this.keyEntryName = keyEntryName;
  }
}
