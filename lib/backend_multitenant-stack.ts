import * as cdk from '@aws-cdk/core';
import * as iam from "@aws-cdk/aws-iam";
import * as appsync from '@aws-cdk/aws-appsync';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cognito from "@aws-cdk/aws-cognito"
import * as CodePipeline from '@aws-cdk/aws-codepipeline'
import * as CodeBuild from '@aws-cdk/aws-codebuild'
import { PolicyStatement } from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3'
import * as cloudfront from '@aws-cdk/aws-cloudfront'; 
import { CfnUserPool, CfnUserPoolClient,ClientAttributes } from '@aws-cdk/aws-cognito';

export class BackendMultitenantStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  
    // The code that defines your stack goes here
    const userPool = new cognito.UserPool(this, "userPool-multiTenantPractice", {
      userPoolName:"multiTenantPractice",
      selfSignUpEnabled: true,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      
      autoVerify: {
        email: true,
        phone:true
      },
      standardAttributes: {
      
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required:true,
          mutable: true
        },
        
        givenName:{
          required: true,
          mutable: true,
        },
        
        
      },
      
      customAttributes:{
        "tenantid": new cognito.StringAttribute({ minLen: 5, maxLen: 15, mutable: false }),
        "tier": new cognito.StringAttribute({ minLen: 5, maxLen: 15, mutable: true }),
        "company_name": new cognito.StringAttribute({ minLen: 5, maxLen: 15, mutable: true }),
        "role": new cognito.StringAttribute({ minLen: 5, maxLen: 15, mutable: true }),
        "account_name": new cognito.StringAttribute({ minLen: 5, maxLen: 15, mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
      },
      
    })
    
    // app client cognito
    const appClient =new cognito.UserPoolClient(this, "App-client-multiTenantPractice",{
      userPool,
      userPoolClientName:"App-client-multiTenantPractice",
      generateSecret:true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
        callbackUrls: [`http://localhost:8000/dashboard/`],
        logoutUrls: [`http://localhost:8000`],
      },
      //authFlow:{}
    })

    // domain
    const domain = userPool.addDomain("CognitoDomain-mutiTenantPractice", {
      cognitoDomain: {
        domainPrefix: "my-awesome-appp",
      },
    });

    const signInUrl = domain.signInUrl(appClient, {
      redirectUri: `http://localhost:8000/dashboard/`, // must be a URL configured under 'callbackUrls' with the client
    });
  //  const cfnPool = userPool.node.defaultChild as CfnUserPool
  //       cfnPool.schema = [
         
  //         {
  //           attributeDataType: 'String',
  //           name: 'tenantid',
  //           mutable: true,
  //           required: true
  //         }
  //       ]
// const cfnClient = appClient.node.defaultChild as CfnUserPoolClient
//         cfnClient.readAttributes = [   
//           "email",
//           'given_name',
//           "custom:tenantid"
//         ];
        // cfnClient.writeAttributes = [
        //   "tenantid"
        // ];
    // cognito user pool
    const identityPool = new cognito.CfnIdentityPool(this, "IdentityPoolmultiTenantPractice", {
    
      allowUnauthenticatedIdentities: false, // Don't allow unathenticated users
      cognitoIdentityProviders: [
        {
          
          clientId: appClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
      identityPoolName:"identity-pool-multiTenantPractice"
    });

    //policy
       const role = new iam.Role(this, "CognitoDefaultAuthenticatedRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    ///Attach particular role to identity pool
    role.addToPolicy(
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "mobileanalytics:PutEvents",
              "cognito-sync:*",
              "cognito-identity:*",
            ],
            resources: ["*"],
        })
    );
    
    ///Attach particular role to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(
        this,
        "IdentityPoolRoleAttachment",
        {
          identityPoolId: identityPool.ref,
          roles: { authenticated: role.roleArn },
        }
    );

    //-------------------api----------------------------//
    const api = new appsync.GraphqlApi(this, "Api", {
      name: "multiTenantPractice",
      schema: appsync.Schema.fromAsset("graphql/schema.gql"),
      
      authorizationConfig: {
        
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,          
          userPoolConfig: { 
            userPool,
            
           },
        },

      },
    
      logConfig: { fieldLogLevel: appsync.FieldLogLevel.ALL },
      xrayEnabled: true,

    });
    
  }
}
