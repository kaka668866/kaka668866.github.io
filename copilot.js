export default {
  async fetch(request, env) {
    return handleRequest(request, env)
  }
}

// ---------------------- CONFIG ----------------------

const CONFIG = {
  result_page: false,
  theme: "",
  cors: true,
  unique_link: false,
  custom_link: true,
  overwrite_kv: false,
  snapchat_mode: false,
  visit_count: false,
  load_kv: false,
  system_type: "shorturl",
}

const PROTECT_KEYS = ["password"]

// ---------------------- UTILITIES ----------------------

function json(data, status = 200, cors = true) {
  const headers = {
    "Content-Type": "application/json;charset=UTF-8",
  }
  if (cors) {
    headers["Access-Control-Allow-Origin"] = "*"
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    headers["Access-Control-Allow-Headers"] = "Content-Type"
  }
  return new Response(JSON.stringify(data), { status, headers })
}

function checkURL(str) {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

async function sha512(str) {
  const data = new TextEncoder().encode(str)
  const digest = await crypto.subtle.digest("SHA-512", data)
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

async function randomKey(len = 6) {
  const chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678"
  let out = ""
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

async function saveURL(env, url) {
  while (true) {
    const key = await randomKey()
    const exist = await env.LINKS.get(key)
    if (!exist) {
      await env.LINKS.put(key, url)
      return key
    }
  }
}

// ---------------------- API HANDLER ----------------------

async function handleAPI(req, env) {
  const body = await req.json()
  const { cmd, url, key, password } = body

  const systemPassword = env.PASSWORD?.trim()
  if (!systemPassword || password !== systemPassword) {
    return json({ status: 500, error: "Invalid password." })
  }

  if (cmd === "add") {
    if (CONFIG.system_type === "shorturl" && !checkURL(url)) {
      return json({ status: 500, error: "URL illegal." })
    }

    let finalKey

    if (CONFIG.custom_link && key) {
      if (PROTECT_KEYS.includes(key)) {
        return json({ status: 500, error: "Key protected." })
      }

      const exist = await env.LINKS.get(key)
      if (exist && !CONFIG.overwrite_kv) {
        return json({ status: 500, error: "Key already exists." })
      }

      await env.LINKS.put(key, url)
      finalKey = key
    }

    else if (CONFIG.unique_link) {
      const hash = await sha512(url)
      const existKey = await env.LINKS.get(hash)
      if (existKey) {
        finalKey = existKey
      } else {
        finalKey = await saveURL(env, url)
        await env.LINKS.put(hash, finalKey)
      }
    }

    else {
      finalKey = await saveURL(env, url)
    }

    return json({ status: 200, key: finalKey })
  }

  if (cmd === "del") {
    if (PROTECT_KEYS.includes(key)) {
      return json({ status: 500, error: "Key protected." })
    }

    await env.LINKS.delete(key)
    if (CONFIG.visit_count) {
      await env.LINKS.delete(key + "-count")
    }

    return json({ status: 200, key })
  }

  if (cmd === "qry") {
    if (PROTECT_KEYS.includes(key)) {
      return json({ status: 500, error: "Key protected." })
    }

    const value = await env.LINKS.get(key)
    if (!value) {
      return json({ status: 500, error: "Key not exist." })
    }

    return json({ status: 200, key, url: value })
  }

  if (cmd === "qryall") {
    if (!CONFIG.load_kv) {
      return json({ status: 500, error: "Config.load_kv disabled." })
    }

    const list = await env.LINKS.list()
    const result = []

    for (const item of list.keys) {
      if (PROTECT_KEYS.includes(item.name)) continue
      if (item.name.endsWith("-count")) continue

      const value = await env.LINKS.get(item.name)
      result.push({ key: item.name, value })
    }

    return json({ status: 200, kvlist: result })
  }

  return json({ status: 500, error: "Unknown command." })
}

// ---------------------- MAIN REQUEST HANDLER ----------------------

async function handleRequest(request, env) {
  const url = new URL(request.url)
  const path = decodeURIComponent(url.pathname.slice(1))

  if (request.method === "OPTIONS") {
    return json({}, 200)
  }

  if (request.method === "POST") {
    return handleAPI(request, env)
  }

  // ---------------------- HOME PAGE ----------------------
  if (!path) {
    const homeURL = `https://kaka668866.github.io/${CONFIG.theme}/short.html`
    return fetch(homeURL)
  }

  // ---------------------- REDIRECT ----------------------
  const value = await env.LINKS.get(path)
  if (value) {
    if (CONFIG.snapchat_mode) {
      await env.LINKS.delete(path)
    }
    if (CONFIG.visit_count) {
      const count = await env.LINKS.get(path + "-count") || 0
      await env.LINKS.put(path + "-count", Number(count) + 1)
    }

    if (CONFIG.result_page) {
      const resultURL = `https://kaka668866.github.io/${CONFIG.theme}/result.html?key=${path}`
      return Response.redirect(resultURL, 302)
    }

    return Response.redirect(value, 302)
  }

  // ---------------------- 404 ----------------------
  return new Response(
    `<!DOCTYPE html><html><body><h1>404 Not Found</h1><p>Short link not found.</p ></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html" } }
  )
}
