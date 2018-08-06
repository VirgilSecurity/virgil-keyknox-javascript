export class KeyknoxError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'KeyknoxError';
  }
}

export class KeyknoxClientError extends KeyknoxError {
  status?: number;
  code?: number;

  constructor(message: string, status?: number, code?: number) {
    super(message);
    this.name = 'KeyknoxClientError';
    this.status = status;
    this.code = code;
  }
}

export class CloudKeyStorageOutOfSyncError extends KeyknoxError {
  constructor() {
    super('CloudKeyStorage is out of sync');
    this.name = 'CloudKeyStorageOutOfSyncError';
  }
}

export class CloudEntryExistsError extends KeyknoxError {
  cloudEntryName: string;

  constructor(cloudEntryName: string) {
    super(`Cloud entry '${cloudEntryName}' already exists`);
    this.name = 'CloudEntryExistsError';
    this.cloudEntryName = cloudEntryName;
  }
}

export class CloudEntryDoesntExistError extends KeyknoxError {
  cloudEntryName: string;

  constructor(cloudEntryName: string) {
    super(`Cloud entry '${cloudEntryName}' doesn't exist`);
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
    this.name = 'KeyEntryDoesntExistError';
    this.keyEntryName = keyEntryName;
  }
}
