import { Construct } from 'constructs';

export class SharedTable extends Construct {
  readonly tableName: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.tableName = `${id}-table`;
  }
}
