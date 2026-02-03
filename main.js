let res;

/** * 关键修改：获取 API 服务地址
 * 以前是 window.location.pathname，如果你访问的是 /short.html，请求就会发错位置。
 * 现在强制使用当前窗口的路径，配合 Works.js 里的密码校验
 */
let apiSrv = window.location.pathname;
// 简单的容错：如果路径以 .html 结尾，尝试使用 localStorage 或其他方式获取，
// 但最稳妥的方法是始终通过 "域名/密码" 访问管理页。

let buildValueItemFunc = buildValueTxt;

function shorturl() {
  // 获取密码输入框的值（由 Worker 注入）
  let password_value = document.querySelector("#passwordText").value;

  if (document.querySelector("#longURL").value == "") {
    alert("Url cannot be empty!");
    return;
  }
  
  document.getElementById('keyPhrase').value = document.getElementById('keyPhrase').value.replace(/\s/g, "-");
  document.getElementById("addBtn").disabled = true;
  document.getElementById("addBtn").innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Please wait...';

  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      cmd: "add", 
      url: document.querySelector("#longURL").value, 
      key: document.querySelector("#keyPhrase").value, 
      password: password_value 
    })
  }).then(function (response) {
    return response.json();
  }).then(function (myJson) {
    res = myJson;
    document.getElementById("addBtn").disabled = false;
    document.getElementById("addBtn").innerHTML = 'Shorten it';

    if (res.status == "200") {
      let keyPhrase = res.key;
      let valueLongURL = document.querySelector("#longURL").value;
      localStorage.setItem(keyPhrase, valueLongURL);
      addUrlToList(keyPhrase, valueLongURL);
      // 生成最终短链地址显示
      document.getElementById("result").innerHTML = window.location.protocol + "//" + window.location.host + "/" + res.key;
    } else {
      document.getElementById("result").innerHTML = res.error;
    }

    var modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();

  }).catch(function (err) {
    alert("Unknow error. Please retry!");
    console.log(err);
    document.getElementById("addBtn").disabled = false;
    document.getElementById("addBtn").innerHTML = 'Shorten it';
  });
}

// ... 其余辅助函数 (copyurl, loadUrlList, addUrlToList, clearLocalStorage, deleteShortUrl 等) 保持不变 ...
// 记得在所有 fetch 请求中确保使用了正确的 apiSrv 和从 #passwordText 获取的 password_value
