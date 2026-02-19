// lib/services/servicebook.ts
import axios from 'axios'

export async function pushToServiceBook(
  estimate: any,
  apiKey: string,
  appId: string
): Promise<string> {
  const knackUrl = `https://api.knack.com/v1/objects/object_1/records`

  const payload = {
    // Map EstimatorAI fields to Knack fields
    field_1: estimate.project_title,
    field_2: estimate.description,
    field_3: estimate.total,
    field_4: JSON.stringify(estimate.line_items),
  }

  const response = await axios.post(knackUrl, payload, {
    headers: {
      'X-Knack-Application-Id': appId,
      'X-Knack-REST-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
  })

  return response.data.id
}
