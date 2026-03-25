
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const defaultMessage = `Firestore Permission Denied: The following request was denied by Firestore Security Rules:\n${JSON.stringify(
      {
        operation: context.operation,
        path: context.path,
        // We only include the data for write operations for brevity
        data: (context.operation === 'create' || context.operation === 'update' || context.operation === 'write') 
              ? context.requestResourceData 
              : undefined,
      },
      null,
      2
    )}`;
    
    super(defaultMessage);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is for correctly setting the prototype chain in environments like TypeScript
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }

  toString() {
    return this.message;
  }
}
