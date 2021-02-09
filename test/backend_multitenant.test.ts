import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as BackendMultitenant from '../lib/backend_multitenant-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new BackendMultitenant.BackendMultitenantStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
