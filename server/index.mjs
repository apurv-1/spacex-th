import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { listRockets, queryLaunches } from './paginate.mjs'

const launches = JSON.parse(readFileSync(new URL('./fixtures/launches.json', import.meta.url), 'utf8'))
const rockets = JSON.parse(readFileSync(new URL('./fixtures/rockets.json', import.meta.url), 'utf8'))
const port = Number(process.env.MOCK_PORT ?? 4000)

const server = createServer(async (request, response) => {
  response.setHeader('access-control-allow-origin', '*')
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
  response.setHeader('access-control-allow-headers', 'content-type')

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', 'http://127.0.0.1')

  try {
    if (request.method === 'GET' && url.pathname === '/v4/rockets') {
      send(response, 200, listRockets(rockets))
      return
    }

    if (request.method === 'POST' && url.pathname === '/v4/launches/query') {
      const body = await readBody(request)
      send(response, 200, queryLaunches(launches, rockets, body))
      return
    }

    send(response, 404, { error: 'Not found' })
  } catch {
    send(response, 400, { error: 'Invalid JSON body' })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`mock spacex api on http://127.0.0.1:${port}`)
})

function send(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(payload))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', (chunk) => {
      chunks.push(chunk)
    })
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    request.on('error', reject)
  })
}
