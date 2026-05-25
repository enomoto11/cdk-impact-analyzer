import { App } from 'aws-cdk-lib';

import { ApiStack } from '../lib/api-stack';
import { WorkerStack } from '../lib/worker-stack';

const app = new App();
new ApiStack(app, 'ApiStack');
new WorkerStack(app, 'WorkerStack');
