import { Stack as MyBaseStack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class AliasedStack extends MyBaseStack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
