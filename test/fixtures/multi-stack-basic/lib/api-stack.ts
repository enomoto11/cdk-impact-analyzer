import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { buildApiSettings } from './api-only-helper';
import { SharedTable } from './shared-table';

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const table = new SharedTable(this, 'Table');
    const settings = buildApiSettings();
    void table;
    void settings;
  }
}
