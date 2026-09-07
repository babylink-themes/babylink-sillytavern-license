(function () {
  'use strict';

  const STORAGE_KEY = 'babylink_sillytavern_license_settings';
  const extensionId = 'babylink-sillytavern-license';
  const defaultOrigin = 'https://babylink.top';

  function randomId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  function loadSettings() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        origin: String(value.origin || defaultOrigin).replace(/\/+$/, ''),
        qq: String(value.qq || ''),
        pluginInstanceId: String(value.pluginInstanceId || randomId())
      };
    } catch {
      return { origin: defaultOrigin, qq: '', pluginInstanceId: randomId() };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function findPanel() {
    return document.querySelector('#extensions_settings2')
      || document.querySelector('#extensions_settings')
      || document.querySelector('#extensions_settings2 > div');
  }

  function createPanel() {
    const panel = findPanel();
    if (!panel || document.getElementById(extensionId)) return Boolean(panel);

    const settings = loadSettings();
    const root = document.createElement('div');
    root.id = extensionId;
    root.className = 'babylink-license-extension';
    root.innerHTML = `
      <div class="babylink-license-title">BabyLink SillyTavern 导入授权</div>
      <div class="babylink-license-copy">在 LINK 手机端生成绑定码，在这里生成当前 LINK 设备专用的解锁密钥。</div>
      <label class="babylink-license-field"><span>LINK 服务地址</span><input data-babylink-origin type="url" placeholder="https://babylink.top"></label>
      <label class="babylink-license-field"><span>QQ 号码</span><input data-babylink-qq inputmode="numeric" placeholder="请输入 QQ 号码"></label>
      <label class="babylink-license-field"><span>LINK 手机绑定码</span><input data-babylink-pairing autocapitalize="characters" spellcheck="false" placeholder="STP-XXXX-XXXX"></label>
      <button data-babylink-issue class="babylink-license-button" type="button">生成解锁密钥</button>
      <div data-babylink-result class="babylink-license-result" hidden></div>
      <div data-babylink-status class="babylink-license-status" role="status"></div>
    `;
    panel.appendChild(root);

    const originInput = root.querySelector('[data-babylink-origin]');
    const qqInput = root.querySelector('[data-babylink-qq]');
    const pairingInput = root.querySelector('[data-babylink-pairing]');
    const issueButton = root.querySelector('[data-babylink-issue]');
    const result = root.querySelector('[data-babylink-result]');
    const status = root.querySelector('[data-babylink-status]');
    originInput.value = settings.origin;
    qqInput.value = settings.qq;

    function setStatus(message, kind) {
      status.textContent = message || '';
      status.className = `babylink-license-status ${kind || ''}`.trim();
    }

    function showKey(key) {
      result.hidden = false;
      result.innerHTML = '';
      const label = document.createElement('span');
      label.textContent = '解锁密钥（只显示在当前页面）';
      const value = document.createElement('strong');
      value.textContent = key;
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = '复制';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(key);
          setStatus('密钥已复制，请回到 LINK 顶部的钥匙按钮中粘贴。', 'success');
        } catch {
          setStatus('复制失败，请手动复制密钥。', 'error');
        }
      });
      result.append(label, value, copy);
    }

    issueButton.addEventListener('click', async () => {
      const origin = String(originInput.value || defaultOrigin).trim().replace(/\/+$/, '');
      const qq = String(qqInput.value || '').trim();
      const pairingCode = String(pairingInput.value || '').trim().toUpperCase();
      if (!/^[1-9]\d{4,11}$/.test(qq)) {
        setStatus('请输入有效的 QQ 号码。', 'error');
        return;
      }
      if (!/^STP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(pairingCode)) {
        setStatus('请输入有效的 LINK 绑定码。', 'error');
        return;
      }
      const nextSettings = { origin, qq, pluginInstanceId: settings.pluginInstanceId };
      saveSettings(nextSettings);
      issueButton.disabled = true;
      result.hidden = true;
      setStatus('正在向 LINK 请求设备专用密钥…');
      try {
        const response = await fetch(`${origin}/api/st-import-license/issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qq, pairingCode, pluginInstanceId: settings.pluginInstanceId })
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || body.error || `请求失败（${response.status}）`);
        showKey(String(body.key || ''));
        setStatus('密钥已生成。请将它输入 LINK，之后当前设备可重复导入。', 'success');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : '生成密钥失败，请稍后重试。', 'error');
      } finally {
        issueButton.disabled = false;
      }
    });
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (createPanel() || attempts >= 30) window.clearInterval(timer);
  }, 1000);
  createPanel();
})();
