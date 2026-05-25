import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { SharedTable } from './shared-table';

export class WorkerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const table = new SharedTable(this, 'Table');
    void table;
  }
}
