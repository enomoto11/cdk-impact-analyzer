declare module 'constructs' {
  export class Construct {
    constructor(scope: Construct | undefined, id: string);
  }
}

declare module 'aws-cdk-lib' {
  import { Construct } from 'constructs';

  export class App extends Construct {
    constructor(props?: unknown);
  }
  export interface StackProps {
    env?: { account?: string; region?: string };
  }
  export class Stack extends Construct {
    constructor(scope: Construct | undefined, id: string, props?: StackProps);
  }
}
