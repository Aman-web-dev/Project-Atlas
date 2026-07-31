# Atlas AI Lambda Functions

Serverless handlers for the AI features of Project Atlas. Designed to be deployed
via AWS SAM (or any compatible SAM framework).

## Endpoints

| Function        | Method | Path    | Purpose                                            |
| --------------- | ------ | ------- | -------------------------------------------------- |
| `ai-copy`       | POST   | `/copy` | Generate ad copy (headlines, descriptions, CTAs).  |
| `ai-image`      | POST   | `/image`| Generate ad creatives in any aspect ratio.         |

## Deploy

```bash
# Build & deploy
sam build
sam deploy --guided

# After deploy, SAM publishes the API URLs as SSM parameters. Read them with:
aws ssm get-parameter --name /atlas/lambda/ai-copy-url
aws ssm get-parameter --name /atlas/lambda/ai-image-url
```

Set these URLs in `.env` as `NEXT_PUBLIC_LAMBDA_AI_COPY_URL` and
`NEXT_PUBLIC_LAMBDA_AI_IMAGE_URL`.

## Environment variables

| Variable           | Required | Description                                                          |
| ------------------ | -------- | -------------------------------------------------------------------- |
| `OPENAI_API_KEY`   | yes      | Used for both `gpt-4o-mini` and `gpt-image-1`.                        |
| `ANTHROPIC_API_KEY`| optional | Reserved for Phase 4 when Claude is added to the routing layer.      |
| `GOOGLE_AI_API_KEY`| optional | Reserved for Phase 4 when Gemini is added to the routing layer.      |
| `ASSETS_BUCKET`    | optional | S3 bucket for image storage. Enables CDN URLs instead of data URLs.  |
| `ASSETS_CDN`       | optional | CloudFront / CDN domain for the bucket.                               |

We strongly recommend putting all API keys in **AWS Secrets Manager** rather than
environment variables in production. The handlers check `process.env` first, then
Secrets Manager if `OPENAI_API_KEY_SECRET_NAME` is set.

## Local invocation

```bash
cd ai-copy
node -e "require('./handler').handler({body: JSON.stringify({productName:'Premium Coffee Beans', platform:'instagram', tone:'casual'})}).then(console.log)"
```

## Cost rules

Per `idea.md` — *"Be cost-conscious"* — every handler:

- Uses `gpt-4o-mini` for copy (not `gpt-4o`).
- Uses `gpt-image-1` for images (no over-resolution).
- Validates input before calling any model.
- Implements graceful fallback when API keys are missing.
- Logs every invocation to CloudWatch for downstream analysis.
- Uses JSON-only responses and short `max_tokens` (≤600).
