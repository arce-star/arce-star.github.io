// Cloudflare Worker — USTC API 代理
// 部署: 复制到 Cloudflare Workers → 创建 → 粘贴 → 部署
// 然后修改 js/ai-assistant.js 里的 API_URL 为你的 worker 地址
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 只允许 POST
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, anthropic-version',
      }
    })
  }

  const url = 'https://api.llm.ustc.edu.cn/v1/messages'
  const modified = new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'Authorization': request.headers.get('Authorization'),
    },
    body: request.body
  })

  const resp = await fetch(modified)
  const data = await resp.text()

  return new Response(data, {
    status: resp.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
