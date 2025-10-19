#!/bin/bash

# FastAPI AWS Deployment Script (Windows-friendly)

set -e

echo "🚀 Starting deployment..."

# Configuration
STACK_NAME="event-mgmt-api"
REGION="af-south-1"
S3_BUCKET="fastapi-deployment-$(aws sts get-caller-identity --query Account --output text)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create S3 bucket if it doesn't exist
echo -e "${YELLOW}📦 Checking S3 bucket...${NC}"
if ! aws s3 ls "s3://${S3_BUCKET}" 2>&1 > /dev/null; then
    echo "Creating S3 bucket: ${S3_BUCKET}"
    aws s3 mb "s3://${S3_BUCKET}" --region ${REGION}
fi

# Create SSM parameters if missing
declare -A PARAMETERS=(
    ["host"]="DB host"
    ["name"]="DB name"
    ["user"]="DB user"
    ["password"]="DB password"
)

for key in "${!PARAMETERS[@]}"; do
    NAME="/event-mgmt-api/db/$key"
    if ! aws ssm get-parameter --name "$NAME" --region "$REGION" > /dev/null 2>&1; then
        echo -e "${YELLOW}🔐 Creating SSM parameter for ${PARAMETERS[$key]}...${NC}"
        if [[ "$key" == "password" ]]; then
            read -sp "Enter ${PARAMETERS[$key]}: " VALUE
            echo
            aws ssm put-parameter --name "$NAME" --value "$VALUE" --type SecureString --overwrite --region $REGION
        else
            read -p "Enter ${PARAMETERS[$key]}: " VALUE
            aws ssm put-parameter --name "$NAME" --value "$VALUE" --type String --overwrite --region $REGION
        fi
        echo -e "${GREEN}✓ Created $NAME${NC}"
    fi
done

# Build and deploy
echo -e "${YELLOW}🔨 Building application...${NC}"
sam build

echo -e "${YELLOW}📤 Deploying to AWS...${NC}"
sam deploy \
    --stack-name ${STACK_NAME} \
    --s3-bucket ${S3_BUCKET} \
    --region ${REGION} \
    --capabilities CAPABILITY_IAM \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

# Get API endpoint
API_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text)

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo -e "${GREEN}API URL: ${API_URL}${NC}"
echo ""
echo "Test your API:"
echo "  curl ${API_URL}"
