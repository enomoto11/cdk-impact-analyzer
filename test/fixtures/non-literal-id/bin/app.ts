import { App } from 'aws-cdk-lib';

import { TemplateStack } from '../lib/template-stack';

const envName = 'prod';
const app = new App();
new TemplateStack(app, `${envName}-Template`);
