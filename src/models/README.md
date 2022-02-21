# Setup local DynamoDB

## Installation

1. Download from https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html
2. Extract and run `java -Djava.library.path=~/Documents/dynamodb/DynamoDBLocal_lib -jar ~/Documents/dynamodb/DynamoDBLocal.jar -sharedDb -dbPath ~/Documents/dynamodb/data`

# Creating tables for local use
After setting up DynamoDB locally, we need to create these tables on our local 
DynamoDB so that our server can read, write, and update the necessary records 
locally. 

Currently, we create these tables in two ways:
- NoSQL Workbench for DynamoDB
- AWS CLI

These document assumes that the reader has configured their AWS CLI credentials,
and that they are running the local DynamoDB directly using Java, instead of
LocalStack. If you are using LocalStack, replace the endpoint URL when calling
DynamoDB (`http://host.docker.internal:8000` instead of `http://localhost:8000`).

## NoSQL Workbench

We have defined a data model containing the table specifications in the 
`dbmodels/workbench.json` file. Creating these tables is as simple as going
into the NoSQL Workbench app, clicking on `Amazon DynamoDB`, and clicking on
the `Import data model` button on the right panel.

To test that you have successfully imported the data models, you can run the
following command:

```
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

And you should expect the following result:
```
{
    "TableNames": [
      "ogpass-auth-request",
      "ogpass-client",  
      "ogpass-sso-session",
      "ogpass-user",
    ]
}
```

However, NoSQL Workbench can be buggy (the imported tables might not show up), so 
if you face problems with this approach, you can go with the CLI approach instead.

## AWS CLI
Alternatively, you can create the tables locally by using the AWS CLI and specifying
the `--endpoint-url` option to be `http://localhost:8000`. This section contains CLI
commands which create tables equivalent to the data model described in the data model
file `dbmodels/workbench.json`.

Check `~/.aws/credentials` to configure your AWS profile.

Note that unlike the data model, we only need to define the attributes which
are keys in the DynamoDB table since attributes can be created on first write.

#### ogpass-sso-session
```
aws dynamodb create-table \
  --table-name ogpass-sso-session \
  --attribute-definitions \
    AttributeName=uuid,AttributeType=S \
  --key-schema AttributeName=uuid,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url http://localhost:8000 \
  --profile <your AWS profile>
```

#### ogpass-user
The `ogpass-user` table needs a global secondary index (GSI) on the `sub` attribute because we only receive the sub from sgID after authentication is completed, and we need to associate the end user's identity with their work email.

```
aws dynamodb create-table \
  --table-name ogpass-user \
  --attribute-definitions \
    AttributeName=govEmail,AttributeType=S \
    AttributeName=state,AttributeType=S \
    AttributeName=sub,AttributeType=S \
    AttributeName=ssoSessionId,AttributeType=S \
  --key-schema AttributeName=govEmail,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"userIdentifier-index\",
        \"KeySchema\": [{\"AttributeName\":\"sub\",\"KeyType\":\"HASH\"}],
        \"Projection\":{
          \"ProjectionType\":\"ALL\"
        },
        \"ProvisionedThroughput\":{
          \"ReadCapacityUnits\":5,
          \"WriteCapacityUnits\":5
        }
      },
      {
        \"IndexName\": \"userState-index\",
        \"KeySchema\": [{\"AttributeName\":\"state\",\"KeyType\":\"HASH\"}],
        \"Projection\":{
          \"ProjectionType\":\"ALL\"
        },
        \"ProvisionedThroughput\":{
          \"ReadCapacityUnits\":5,
          \"WriteCapacityUnits\":5
        }
      }
    ]" \
  --endpoint-url http://localhost:8000 \
  --profile <your AWS profile>
```

#### ogpass-oidc-provider
```
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name ogpass-oidc-provider \
  --attribute-definitions \
    AttributeName=modelId,AttributeType=S \
    AttributeName=uid,AttributeType=S \
    AttributeName=grantId,AttributeType=S \
    AttributeName=userCode,AttributeType=S \
  --key-schema AttributeName=modelId,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"uidIndex\",
        \"KeySchema\": [{\"AttributeName\":\"uid\",\"KeyType\":\"HASH\"}],
        \"Projection\":{
          \"ProjectionType\":\"ALL\"
        },
        \"ProvisionedThroughput\":{
          \"ReadCapacityUnits\":5,
          \"WriteCapacityUnits\":5
        }
      },
      {
        \"IndexName\": \"grantIdIndex\",
        \"KeySchema\": [{\"AttributeName\":\"grantId\",\"KeyType\":\"HASH\"}],
        \"Projection\":{
          \"ProjectionType\":\"ALL\"
        },
        \"ProvisionedThroughput\":{
          \"ReadCapacityUnits\":5,
          \"WriteCapacityUnits\":5
        }
      },
      {
        \"IndexName\": \"userCodeIndex\",
        \"KeySchema\": [{\"AttributeName\":\"userCode\",\"KeyType\":\"HASH\"}],
        \"Projection\":{
          \"ProjectionType\":\"ALL\"
        },
        \"ProvisionedThroughput\":{
          \"ReadCapacityUnits\":5,
          \"WriteCapacityUnits\":5
        }
      }
    ]" \
    --profile <your AWS profile>
```

After doing this, wait for the table to be created before running the following command to set the TTL attribute.

```
aws dynamodb update-time-to-live \
  --table-name ogpass-oidc-provider \
  --time-to-live-specification "Enabled=true, AttributeName=ttl" \
  --endpoint-url http://localhost:8000 \
  --profile <your AWS profile>
```

# To-do
Complete `workbench.json` file for remaining tables.

# References
- [AWS DynamoDB CLI Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tools.CLI.html)
- [AWS DynamoDB CLI Guide for specifying global secondary indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GCICli.html)
- [AWS DynamoDB CLI API for `create-table`](https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html)

