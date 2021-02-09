#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BackendMultitenantStack } from '../lib/backend_multitenant-stack';

const app = new cdk.App();
new BackendMultitenantStack(app, 'BackendMultitenantStack');
