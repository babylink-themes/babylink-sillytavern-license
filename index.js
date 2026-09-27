(function () {
  'use strict';

  const STORAGE_KEY = 'babylink_sillytavern_license_settings';
  const extensionId = 'babylink-sillytavern-license';
  const defaultOrigin = 'https://babylink.top';
  const requestTimeoutMs = 20_000;
  const accountIdPattern = /^(?:[1-9]\d{4,11}|dc_\d{5,32})$/;

  function randomId() {
    try {
      if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
      if (globalThis.crypto && globalThis.crypto.getRandomValues) {
        const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
        return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
      }
    } catch {
      // SillyTavern may expose a restricted WebView crypto object.
    }
    return 'st-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function normalizeOrigin(value) {
    const origin = String(value || defaultOrigin).trim().replace(/\/+$/, '');
    try {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol)) return defaultOrigin;
      return parsed.origin;
    } catch {
      return defaultOrigin;
    }
  }

  function loadSettings() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        origin: normalizeOrigin(value.origin),
        accountId: String(value.accountId || value.qq || '').trim(),
        pluginInstanceId: String(value.pluginInstanceId || randomId()).trim()
      };
    } catch {
      return { origin: defaultOrigin, accountId: '', pluginInstanceId: randomId() };
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // The authorization request itself remains usable if storage is blocked.
    }
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
    root.innerHTML = [
      '<details class="babylink-license-details">',
      '<summary class="babylink-license-summary">BabyLink SillyTavern 导入授权</summary>',
      '<div class="babylink-license-body">',
      '<p class="babylink-license-copy">在 LINK 中生成一次性绑定码后，在这里生成当前 SillyTavern 实例的永久解锁密钥。</p>',
      '<label class="babylink-license-field"><span>LINK 服务地址</span><input data-babylink-origin type="url" placeholder="https://babylink.top"></label>',
      '<label class="babylink-license-field"><span>QQ 号或 Discord 账号标识（可选）</span><input data-babylink-account inputmode="text" autocomplete="off" placeholder="QQ号，或 dc_123456789012345678"></label>',
      '<small class="babylink-license-hint">Discord 登录用户可以留空；服务器会根据一次性绑定码自动识别账号。</small>',
      '<label class="babylink-license-field"><span>LINK 设备绑定码</span><input data-babylink-pairing autocapitalize="characters" spellcheck="false" placeholder="STP-XXXX-XXXX"></label>',
      '<button data-babylink-issue class="babylink-license-button" type="button">生成永久解锁密钥</button>',
      '<div data-babylink-result class="babylink-license-result" hidden></div>',
      '<div data-babylink-status class="babylink-license-status" role="status"></div>',
      '</div>',
      '</details>'
    ].join('');
    panel.appendChild(root);

    const originInput = root.querySelector('[data-babylink-origin]');
    const accountInput = root.querySelector('[data-babylink-account]');
    const pairingInput = root.querySelector('[data-babylink-pairing]');
    const issueButton = root.querySelector('[data-babylink-issue]');
    const result = root.querySelector('[data-babylink-result]');
    const status = root.querySelector('[data-babylink-status]');
    originInput.value = settings.origin;
    accountInput.value = settings.accountId;

    function setStatus(message, kind) {
      status.textContent = message || '';
      status.className = ('babylink-license-status ' + (kind || '')).trim();
    }

    function showKey(key) {
      result.hidden = false;
      result.replaceChildren();
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
          setStatus('密钥已复制，请回到 LINK 页面粘贴。', 'success');
        } catch {
          setStatus('复制失败，请手动复制上方密钥。', 'error');
        }
      });
      result.append(label, value, copy);
    }

    issueButton.addEventListener('click', async () => {
      const origin = normalizeOrigin(originInput.value);
      const accountId = String(accountInput.value || '').trim();
      const pairingCode = String(pairingInput.value || '').trim().toUpperCase().replace(/\s+/g, '');
      if (accountId && !accountIdPattern.test(accountId)) {
        setStatus('账号标识格式无效：请输入 QQ 号或 dc_ 开头的 Discord 账号标识。', 'error');
        return;
      }
      if (!/^STP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(pairingCode)) {
        setStatus('请输入有效的 LINK 设备绑定码。', 'error');
        return;
      }

      const nextSettings = { origin, accountId, pluginInstanceId: settings.pluginInstanceId || randomId() };
      saveSettings(nextSettings);
      issueButton.disabled = true;
      result.hidden = true;
      setStatus('正在向 LINK 请求当前设备的永久授权密钥……');
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetch(origin + '/api/st-import-license/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: accountId || undefined,
            pairingCode: pairingCode,
            pluginInstanceId: nextSettings.pluginInstanceId
          }),
          signal: controller.signal
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || body.error || ('请求失败（' + response.status + '）'));
        const key = String(body.key || '').trim();
        if (!key) throw new Error('服务器没有返回有效解锁密钥，请稍后重试。');
        showKey(key);
        setStatus('密钥已生成。请复制后回到 LINK 页面粘贴激活。', 'success');
      } catch (error) {
        setStatus(error && error.name === 'AbortError'
          ? '请求超时，请检查 LINK 地址和网络后重试。'
          : (error instanceof Error ? error.message : '生成解锁密钥失败，请稍后重试。'), 'error');
      } finally {
        window.clearTimeout(timeout);
        issueButton.disabled = false;
      }
    });
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (createPanel() || attempts >= 60) window.clearInterval(timer);
  }, 1000);
  createPanel();
})();
