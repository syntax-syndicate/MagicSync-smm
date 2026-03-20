export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const audioUrl = String(query.url || '')

  if (!audioUrl) {
    throw createError({ statusCode: 400, message: 'url is required' })
  }

  try {
    const res = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      throw createError({ statusCode: 502, message: 'Failed to fetch audio' })
    }

    const contentType = res.headers.get('content-type') || 'audio/mpeg'

    setResponseHeaders(event, {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    })

    const resBody = await res.arrayBuffer()
    return new Uint8Array(resBody)
  } catch {
    throw createError({ statusCode: 502, message: 'Failed to proxy audio file' })
  }
})
