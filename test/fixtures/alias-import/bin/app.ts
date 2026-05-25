import { App } from 'aws-cdk-lib';

import { AliasedStack } from '../lib/aliased-stack';

const app = new App();
new AliasedStack(app, 'AliasedStack');
