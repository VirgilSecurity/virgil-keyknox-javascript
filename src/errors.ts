export class KeyknoxError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'KeyknoxError';
  }
}

export class KeyknoxClientError extends Error {
  status?: number;
  code?: number;

  constructor(message: string, status?: number, code?: number) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'KeyknoxClientError';
    this.status = status;
    this.code = code;
  }
}

export class CloudKeyStorageOutOfSyncError extends Error {
  constructor() {
    super('CloudKeyStorage is out of sync');
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'CloudKeyStorageOutOfSyncError';
  }
}

export class CloudEntryExistsError extends Error {
  cloudEntryName: string;

  constructor(cloudEntryName: string) {
    super(`Cloud entry '${cloudEntryName}' already exists`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'CloudEntryExistsError';
    this.cloudEntryName = cloudEntryName;
  }
}

export class CloudEntryDoesntExistError extends Error {
  cloudEntryName: string;

  constructor(cloudEntryName: string) {
    super(`Cloud entry '${cloudEntryName}' doesn't exist`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'CloudEntryDoesntExistError';
    this.cloudEntryName = cloudEntryName;
  }
}

export class KeyEntryExistsError extends Error {
  keyEntryName: string;

  constructor(keyEntryName: string) {
    super(`Key entry '${keyEntryName}' already exists`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'KeyEntryExistsError';
    this.keyEntryName = keyEntryName;
  }
}

export class KeyEntryDoesntExistError extends Error {
  keyEntryName: string;

  constructor(keyEntryName: string) {
    super(`Key entry '${keyEntryName}' doesn't exist`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'KeyEntryDoesntExistError';
    this.keyEntryName = keyEntryName;
  }
}

export class GroupTicketAlreadyExistsError extends Error {
  constructor() {
    super('GroupSessionMessageInfo already exist');
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'GroupTicketAlreadyExistsError';
  }
}

export class GroupTicketDoesntExistError extends Error {
  constructor() {
    super("Group ticket doesn't exist");
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'GroupTicketDoesntExistError';
  }
}
