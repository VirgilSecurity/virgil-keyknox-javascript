export class KeyknoxError extends Error {
  constructor(message: string, name: string = 'KeyknoxError', ParentClass: any = KeyknoxError) {
    super(message);
    Object.setPrototypeOf(this, ParentClass.prototype);
    this.name = name;
  }
}

export class KeyknoxClientError extends KeyknoxError {
  status?: number;
  code?: number;

  constructor(message: string, status?: number, code?: number) {
    super(message, 'KeyknoxClientError', KeyknoxClientError);
    this.status = status;
    this.code = code;
  }
}

export class CloudKeyStorageOutOfSyncError extends KeyknoxError {
  constructor() {
    super(
      'CloudKeyStorage is out of sync',
      'CloudKeyStorageOutOfSyncError',
      CloudKeyStorageOutOfSyncError,
    );
  }
}

export class CloudEntryExistsError extends KeyknoxError {
  cloudEntryName: string;

  constructor(cloudEntryName: string) {
    super(
      `Cloud entry '${cloudEntryName}' already exists`,
      'CloudEntryExistsError',
      CloudEntryExistsError,
    );
    this.cloudEntryName = cloudEntryName;
  }
}

export class CloudEntryDoesntExistError extends KeyknoxError {
  cloudEntryName: string;

  constructor(cloudEntryName: string) {
    super(
      `Cloud entry '${cloudEntryName}' doesn't exist`,
      'CloudEntryDoesntExistError',
      CloudEntryDoesntExistError,
    );
    this.cloudEntryName = cloudEntryName;
  }
}

export class KeyEntryExistsError extends KeyknoxError {
  keyEntryName: string;

  constructor(keyEntryName: string) {
    super(
      `Key entry '${keyEntryName}' already exists`,
      'KeyEntryExistsError',
      KeyEntryExistsError,
    );
    this.keyEntryName = keyEntryName;
  }
}

export class KeyEntryDoesntExistError extends KeyknoxError {
  keyEntryName: string;

  constructor(keyEntryName: string) {
    super(
      `Key entry '${keyEntryName}' doesn't exist`,
      'KeyEntryDoesntExistError',
      KeyEntryDoesntExistError,
    );
    this.keyEntryName = keyEntryName;
  }
}
