# DNS Configuration Required

## Current Issue
The domain `estimatorai.com` is registered but pointing to a GoDaddy parking page instead of the Vercel deployment.

## Solution Required

### Option A: Add A Record (Recommended - Easiest)
1. Log in to GoDaddy account
2. Go to DNS Management for estimatorai.com
3. Add an **A Record**:
   - **Type**: A
   - **Name**: @
   - **Value**: `76.76.21.21`
   - **TTL**: 600 (or default)

4. Add an **A Record** for www:
   - **Type**: A
   - **Name**: www
   - **Value**: `76.76.21.21`
   - **TTL**: 600 (or default)

### Option B: Change Nameservers (Alternative)
1. Log in to GoDaddy account
2. Go to Domain Settings for estimatorai.com
3. Change nameservers to:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

## Verification

After making DNS changes:
1. Wait 5-10 minutes for DNS propagation
2. Test: `curl -I https://estimatorai.com`
3. Should return Vercel headers (not GoDaddy parking page)
4. Test the estimate generation endpoint

## Quick Test Command
```bash
# After DNS is configured, test with:
curl -X POST https://estimatorai.com/api/estimates/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: [valid-session-cookie]" \
  -d '{
    "description": "Install ceiling fan",
    "photos": [],
    "projectType": "electrical",
    "location": "US"
  }'
```

## Resources
- Vercel Domain Configuration: https://vercel.com/docs/projects/domains
- GoDaddy DNS Management: https://www.godaddy.com/help/manage-dns-records-680
