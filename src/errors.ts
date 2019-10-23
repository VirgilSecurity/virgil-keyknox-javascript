export class KeyknoxError extends Error {
  constructor(message: string, name = 'KeyknoxError', DerivedClass: any = KeyknoxError) {
    super(message);
    Object.setPrototypeOf(this, DerivedClass.prototype);
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
    super(`Key entry '${keyEntryName}' already exists`, 'KeyEntryExistsError', KeyEntryExistsError);
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

export class GroupTicketAlreadyExistsError extends KeyknoxError {
  constructor() {
    super(
      'GroupSessionMessageInfo already exist',
      'GroupTicketAlreadyExistsError',
      GroupTicketAlreadyExistsError,
    );
  }
}

export class GroupTicketDoesntExistError extends KeyknoxError {
  constructor() {
    super("Group ticket doesn't exist", 'GroupTicketDoesntExistError', GroupTicketDoesntExistError);
  }
}

export class GroupTicketNoAccessError extends KeyknoxError {
  constructor() {
    super(
      'Current user has no access to the group ticket',
      'GroupTicketNoAccessError',
      GroupTicketNoAccessError,
    );
  }
}
