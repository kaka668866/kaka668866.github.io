// 配置项（需替换为你的Worker域名和管理密码）
const CONFIG = {
  WORKER_DOMAIN: "https://your-worker-domain.com", // 替换为你的Worker域名
  ADMIN_PASSWORD: "__PASSWORD__" // 替换为你的管理密码（和HTML中的__PASSWORD__一致）
};

// 生成短链核心函数
async function shorturl() {
  const longURL = document.getElementById("longURL").value.trim();
  const keyPhrase = document.getElementById("keyPhrase").value.trim();
  const password = document.getElementById("passwordText").value.trim();

  if (!longURL) {
    showModal("Error", "Please enter a long URL!");
    return;
  }

  try {
    const response = await fetch(`${CONFIG.WORKER_DOMAIN}/api/shorten`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${password}`
      },
      body: JSON.stringify({
        longUrl: longURL,
        key: keyPhrase || Math.random().toString(36).slice(2, 8) // 随机生成后缀
      })
    });

    const data = await response.json();
    if (response.ok) {
      // 生成成功后更新本地存储并刷新列表
      const shortUrl = `${CONFIG.WORKER_DOMAIN}/${data.key}`;
      localStorage.setItem(data.key, longURL);
      showModal("Success", `Short URL: <a href="${shortUrl}" target="_blank">${shortUrl}</a>`);
      loadUrlList(); // 刷新列表
    } else {
      showModal("Error", data.message || "Failed to shorten URL!");
    }
  } catch (error) {
    showModal("Error", "Network error: " + error.message);
  }
}

// 加载本地存储的短链列表
function loadUrlList() {
  const urlListEl = document.getElementById("urlList");
  urlListEl.innerHTML = ""; // 清空原有列表

  // 遍历localStorage中的所有短链
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const longUrl = localStorage.getItem(key);
    const shortUrl = `${CONFIG.WORKER_DOMAIN}/${key}`;

    // 生成列表项DOM
    const listItem = document.createElement("div");
    listItem.className = "mb-3 list-group-item";
    listItem.innerHTML = `
      <div class="input-group">
        <button type="button" class="btn btn-danger" onclick='deleteShortUrl("${key}")'>X</button>
        <button type="button" class="btn btn-info" onclick='queryVisitCount("${key}")'>?</button>
        <span class="form-control">${shortUrl}</span>
      </div>
      <div class="form-control mt-2">${longUrl}</div>
    `;
    urlListEl.appendChild(listItem);
  }

  // 无数据时提示
  if (localStorage.length === 0) {
    urlListEl.innerHTML = '<div class="list-group-item text-muted">No short URLs in localStorage</div>';
  }
}

// 清空本地存储
function clearLocalStorage() {
  if (confirm("Are you sure to clear all localStorage data?")) {
    localStorage.clear();
    loadUrlList(); // 刷新列表
  }
}

// 从KV同步数据到本地存储
async function loadKV() {
  const password = document.getElementById("passwordText").value.trim();
  try {
    const response = await fetch(`${CONFIG.WORKER_DOMAIN}/api/list`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${password}`
      }
    });

    const data = await response.json();
    if (response.ok) {
      // 清空本地存储后同步KV数据
      localStorage.clear();
      Object.entries(data).forEach(([key, longUrl]) => {
        localStorage.setItem(key, longUrl);
      });
      loadUrlList(); // 刷新列表
      showModal("Success", "Synced KV data to localStorage!");
    } else {
      showModal("Error", data.message || "Failed to load KV data!");
    }
  } catch (error) {
    showModal("Error", "Network error: " + error.message);
  }
}

// 删除短链（同时删除KV和本地存储）
async function deleteShortUrl(key) {
  if (!confirm(`Are you sure to delete ${key}?`)) return;

  const password = document.getElementById("passwordText").value.trim();
  try {
    // 先删除KV中的数据
    const response = await fetch(`${CONFIG.WORKER_DOMAIN}/api/delete/${key}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${password}`
      }
    });

    if (response.ok) {
      // 再删除本地存储
      localStorage.removeItem(key);
      loadUrlList(); // 刷新列表
      showModal("Success", `Deleted ${key} successfully!`);
    } else {
      const data = await response.json();
      showModal("Error", data.message || `Failed to delete ${key}!`);
    }
  } catch (error) {
    showModal("Error", "Network error: " + error.message);
  }
}

// 查询短链访问量
async function queryVisitCount(key) {
  try {
    const response = await fetch(`${CONFIG.WORKER_DOMAIN}/api/count/${key}`);
    const data = await response.json();
    if (response.ok) {
      showModal("Visit Count", `${key}: ${data.count} visits`);
    } else {
      showModal("Error", data.message || `Failed to get count for ${key}!`);
    }
  } catch (error) {
    showModal("Error", "Network error: " + error.message);
  }
}

// 复制短链
function copyurl(elementId) {
  const resultEl = document.getElementById(elementId);
  const text = resultEl.innerText.replace(/Success: |Error: /, "").trim();
  navigator.clipboard.writeText(text).then(() => {
    // 显示复制成功提示
    const popover = new bootstrap.Popover(document.querySelector('[data-bs-toggle="popover"]'), {
      trigger: 'manual'
    });
    popover.show();
    setTimeout(() => popover.hide(), 2000);
  }).catch(err => {
    showModal("Error", "Failed to copy: " + err.message);
  });
}

// 显示弹窗
function showModal(title, content) {
  document.getElementById("resultModalLabel").innerText = title;
  document.getElementById("result").innerHTML = content;
  const modal = new bootstrap.Modal(document.getElementById("resultModal"));
  modal.show();
}

// 页面加载时自动加载本地列表
window.onload = loadUrlList;
