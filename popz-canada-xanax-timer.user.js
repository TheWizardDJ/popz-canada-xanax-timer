// ==UserScript==
// @name         -PopZ- Canada Xanax Flight Timer
// @namespace    https://popz.world/
// @version      1.1.3
// @description  Shows the recommended Canada departure time for the latest confirmed Xanax restock.
// @author       TheWizardDJ
// @license      Copyright TheWizardDJ
// @homepageURL  https://github.com/TheWizardDJ/popz-canada-xanax-timer
// @supportURL   https://github.com/TheWizardDJ/popz-canada-xanax-timer/issues
// @antifeature  payment Requires one Xanax per week for active subscriber access.
// @antifeature  membership Requires current membership in PopZ factions 36201 or 56889.
// @match        https://www.torn.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      api.popz.world
// @connect      greasyfork.org
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const API = 'https://api.popz.world/xanax-timer';
  const GREASY_FORK_SCRIPT_URL = 'https://greasyfork.org/en/scripts/586894-popz-canada-xanax-flight-timer';
  const GREASY_FORK_METADATA_URL = 'https://greasyfork.org/en/scripts/586894.json';
  const SCRIPT_VERSION = '1.1.3';
  const RECIPIENT_ID = '1800878';
  const DEFAULT_FLIGHT_MINUTES = 27;

  let status;
  let detailOpen = false;
  let flightAlertEnabled = false;
  let collapsed = false;
  let updateVersion = '';
  let updateCheckInFlight = false;

  const get = (key, fallback) => GM_getValue(key, fallback);
  const set = (key, value) => GM_setValue(key, value);

  function request(path, method = 'GET', body) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url: `${API}${path}`,
        headers: {
          Authorization: `Bearer ${get('token', '')}`,
          'Content-Type': 'application/json'
        },
        data: body ? JSON.stringify(body) : undefined,
        onload: (response) => {
          try {
            const data = JSON.parse(response.responseText);
            if (response.status >= 200 && response.status < 300) {
              resolve(data);
            } else {
              reject(new Error(data.error || 'Timer request failed'));
            }
          } catch {
            reject(new Error('Timer response was invalid'));
          }
        },
        onerror: () => reject(new Error('Timer is unavailable'))
      });
    });
  }

  const style = document.createElement('style');
  style.textContent = `
    #popz-xanax {
      position: fixed;
      left: 16px;
      top: 80px;
      z-index: 2147483647;
      width: 210px;
      background: #152028;
      color: #edf6fb;
      border: 1px solid #4d7183;
      border-radius: 7px;
      box-shadow: 0 6px 20px #0008;
      font: 12px Arial, sans-serif;
      user-select: none;
      transition: left .18s ease;
    }
    #popz-xanax.warn { border-color: #f59e0b; }
    #popz-xanax.urgent { border-color: #ef4444; }
    #popz-xanax.off { opacity: .72; border-color: #68737a; }
    #popz-xanax button {
      background: #287ca0;
      color: #fff;
      border: 0;
      border-radius: 4px;
      padding: 6px;
      cursor: pointer;
    }
    #popz-xanax .update {
      margin: 3px 0;
      background: #c26b19;
    }
    #pzCollapse {
      position: absolute;
      right: -22px;
      top: 10px;
      width: 22px;
      height: 38px;
      padding: 0 !important;
      border: 1px solid #4d7183 !important;
      border-radius: 0 4px 4px 0 !important;
      background: #1c343f !important;
      font-size: 16px !important;
    }
    #popz-xanax.edge-right #pzCollapse {
      left: -22px;
      right: auto;
      border-radius: 4px 0 0 4px !important;
    }
    #popz-xanax .bell,
    #popz-xanax .travel-link {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 4px;
      padding: 1px 4px;
      min-width: 25px;
      min-height: 22px;
      font: inherit;
      font-size: 13px;
      line-height: 1;
      background: transparent;
      border: 1px solid #557786;
      border-radius: 4px;
    }
    #popz-xanax .bell.enabled { color: #ffd166; border-color: #ffd166; }
    #popz-xanax .bell:not(.enabled) { opacity: .65; }
    #popz-xanax .bell:not(.enabled)::after {
      content: '';
      position: absolute;
      left: 2px;
      right: 2px;
      top: 50%;
      height: 2px;
      background: #ef4444;
      transform: rotate(-35deg);
    }
    #popz-xanax .travel-link {
      color: #edf6fb;
      text-decoration: none;
    }
    #popz-xanax .travel-link:hover { color: #a9e7ff; border-color: #a9e7ff; }
    #popz-xanax .top {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 9px;
      font-size: 14px;
      font-weight: bold;
      cursor: grab;
      touch-action: none;
    }
    #popz-xanax #pzSettings {
      margin-left: auto;
      min-width: 25px;
      padding: 3px !important;
      background: #1c343f;
      font-size: 15px;
      line-height: 1;
    }
    #popz-xanax .top:active { cursor: grabbing; }
    #popz-xanax .body { padding: 0 9px 9px; line-height: 1.55; }
    #popz-xanax .detail {
      display: none;
      padding: 0 9px 9px;
      border-top: 1px solid #39515d;
    }
    #popz-xanax.open .detail { display: block; }
    #popz-xanax input {
      width: 100%;
      box-sizing: border-box;
      background: #0f1519;
      color: #fff;
      border: 1px solid #526875;
      border-radius: 3px;
      padding: 3px;
    }
    #popz-xanax #pzMins { width: 54px; }
    #popz-xanax a { color: #a9e7ff; }
    #popz-flight-alert {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      pointer-events: none;
      box-sizing: border-box;
      border: 6px solid #ef4444;
      box-shadow: inset 0 0 24px #ef444499;
    }
    #popz-flight-alert.active { display: block; }
  `;
  document.head.append(style);

  const flightAlert = document.createElement('div');
  flightAlert.id = 'popz-flight-alert';
  document.body.append(flightAlert);
  flightAlertEnabled = Boolean(get('flight_alert_enabled', false));

  const box = document.createElement('aside');
  box.id = 'popz-xanax';
  box.innerHTML = `
    <button id="pzCollapse" title="Collapse timer to page edge">&raquo;</button>
    <div class="top"><span>&#128138;</span><span>Canada Xanax Timer</span><button id="pzSettings" title="Open timer settings" aria-label="Open timer settings">&#9881;</button></div>
    <div class="body">Connecting...</div>
    <div class="detail"></div>
  `;
  document.body.append(box);

  const storedPosition = get('overlay_position', null);
  if (storedPosition) {
    box.style.left = `${storedPosition.left}px`;
    box.style.top = `${storedPosition.top}px`;
  }

  function applyCollapsedState() {
    const edge = get('overlay_edge', 'left');
    const position = get('overlay_position', { left: 16, top: 80 });
    const button = document.querySelector('#pzCollapse');

    box.classList.toggle('edge-right', edge === 'right');
    if (collapsed) {
      box.style.top = `${Math.max(0, Math.min(window.innerHeight - box.offsetHeight, position.top))}px`;
      box.style.left = edge === 'right' ? `${window.innerWidth - 22}px` : `${-box.offsetWidth + 22}px`;
    } else {
      box.style.left = `${position.left}px`;
      box.style.top = `${position.top}px`;
    }

    button.innerHTML = collapsed ? (edge === 'right' ? '&laquo;' : '&raquo;') : (edge === 'right' ? '&raquo;' : '&laquo;');
    button.title = collapsed ? 'Expand timer' : 'Collapse timer to page edge';
  }

  collapsed = Boolean(get('timer_collapsed', false));
  applyCollapsedState();

  document.querySelector('#pzCollapse').addEventListener('click', (event) => {
    event.stopPropagation();
    if (!collapsed) {
      const edge = box.offsetLeft + box.offsetWidth / 2 < window.innerWidth / 2 ? 'left' : 'right';
      set('overlay_edge', edge);
      set('overlay_position', { left: box.offsetLeft, top: box.offsetTop });
    }
    collapsed = !collapsed;
    set('timer_collapsed', collapsed);
    applyCollapsedState();
  });

  window.addEventListener('resize', () => {
    if (collapsed) applyCollapsedState();
  });

  const header = box.querySelector('.top');
  let drag = null;
  let dragged = false;

  header.addEventListener('pointerdown', (event) => {
    if (event.target.closest('#pzSettings')) return;
    drag = { x: event.clientX, y: event.clientY, left: box.offsetLeft, top: box.offsetTop };
    dragged = false;
    header.setPointerCapture(event.pointerId);
  });

  header.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const left = Math.max(0, Math.min(window.innerWidth - box.offsetWidth, event.clientX - drag.x + drag.left));
    const top = Math.max(0, Math.min(window.innerHeight - box.offsetHeight, event.clientY - drag.y + drag.top));
    if (Math.abs(left - drag.left) > 3 || Math.abs(top - drag.top) > 3) dragged = true;
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
  });

  header.addEventListener('pointerup', (event) => {
    if (!drag) return;
    header.releasePointerCapture(event.pointerId);
    const moved = dragged;
    drag = null;
    if (moved) {
      set('overlay_position', { left: box.offsetLeft, top: box.offsetTop });
    }
  });

  document.querySelector('#pzSettings').addEventListener('click', (event) => {
    event.stopPropagation();
    detailOpen = !detailOpen;
    box.classList.toggle('open', detailOpen);
    render();
  });

  async function activate(key) {
    if (!key) return;
    try {
      const data = await request('/api/activate', 'POST', { api_key: key.trim() });
      await set('token', data.token);
      await refresh();
    } catch (error) {
      alert(error.message);
    }
  }

  function duration() {
    const saved = Number(get('flight_minutes', DEFAULT_FLIGHT_MINUTES));
    return Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_FLIGHT_MINUTES;
  }

  function remaining(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  function countdown(date) {
    const seconds = Math.max(0, Math.floor((new Date(date).getTime() - Date.now()) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m ${seconds % 60}s`;
  }

  function newerVersion(candidate, current) {
    const candidateParts = String(candidate).split('.').map(part => Number(part) || 0);
    const currentParts = String(current).split('.').map(part => Number(part) || 0);
    const length = Math.max(candidateParts.length, currentParts.length);
    for (let index = 0; index < length; index += 1) {
      if ((candidateParts[index] || 0) !== (currentParts[index] || 0)) return (candidateParts[index] || 0) > (currentParts[index] || 0);
    }
    return false;
  }

  function checkForUpdate() {
    if (updateCheckInFlight) return;
    const lastChecked = Number(get('greasyfork_update_checked_at', 0));
    const cachedVersion = get('greasyfork_update_version', '');
    if (Date.now() - lastChecked < 86400_000) {
      updateVersion = newerVersion(cachedVersion, SCRIPT_VERSION) ? cachedVersion : '';
      return;
    }
    updateCheckInFlight = true;
    GM_xmlhttpRequest({
      method: 'GET',
      url: GREASY_FORK_METADATA_URL,
      onload: (response) => {
        updateCheckInFlight = false;
        try {
          const latest = JSON.parse(response.responseText).version || '';
          set('greasyfork_update_checked_at', Date.now());
          set('greasyfork_update_version', latest);
          updateVersion = newerVersion(latest, SCRIPT_VERSION) ? latest : '';
          render();
        } catch { /* Keep the current overlay when Greasy Fork metadata is unavailable. */ }
      },
      onerror: () => { updateCheckInFlight = false; }
    });
  }

  function renderActivation(body, detail) {
    flightAlert.classList.remove('active');
    detail.innerHTML = '';
    if (body.dataset.activationRendered) return;

    body.dataset.activationRendered = 'true';
    body.innerHTML = `
      <a href="https://www.torn.com/preferences.php#tab=api?step=addNewKey&user=profile&title=EnrollXanaxFlightTimer" target="_blank" rel="noopener">Create profile key</a><br>
      <input id="pzApiKey" type="text" maxlength="16" autocomplete="off" placeholder="16-character API key"><br>
      <button id="pzActivate">Activate</button><br>
      <small>New subscribers receive a free 7-day trial. The key is used once for player and faction verification, then discarded. Player and subscription status are stored. <a href="${API}/privacy.html" target="_blank" rel="noopener">Privacy</a></small>
    `;
    document.querySelector('#pzActivate').addEventListener('click', () => activate(document.querySelector('#pzApiKey').value));
  }

  function render() {
    const body = box.querySelector('.body');
    const detail = box.querySelector('.detail');

    if (!status) {
      renderActivation(body, detail);
      return;
    }

    delete body.dataset.activationRendered;
    const subscription = status.subscription;
    const restock = status.restock;
    const flightMinutes = duration();
    const leave = restock ? new Date(new Date(restock.at).getTime() - flightMinutes * 60000) : null;
    const leaveSeconds = leave ? Math.floor((leave.getTime() - Date.now()) / 1000) : 0;
    const leavePending = leave && Date.now() >= leave.getTime() + 60000;

    flightAlert.classList.toggle('active', Boolean(subscription.active && flightAlertEnabled && leaveSeconds > 0 && leaveSeconds <= 60));

    const state = !subscription.active
      ? 'off'
      : subscription.owner_access
        ? ''
        : subscription.remaining_seconds <= 3600
          ? 'urgent'
          : subscription.remaining_seconds <= 86400
            ? 'warn'
            : '';
    box.className = `${state}${detailOpen ? ' open' : ''}${get('overlay_edge', 'left') === 'right' ? ' edge-right' : ''}`;

    body.innerHTML = `
      <strong>${subscription.owner_access ? 'Owner access' : subscription.active ? 'Active' : 'Inactive'}</strong><br>
      Sub: ${subscription.owner_access ? 'Unrestricted' : remaining(subscription.remaining_seconds)}<br>
      ${updateVersion ? `<button id="pzUpdate" class="update">Update available: ${updateVersion}</button><br>` : ''}
      ${restock ? `
        Leave in: ${leavePending ? 'Pending' : countdown(leave)}
        <button id="pzBell" class="bell ${flightAlertEnabled ? 'enabled' : ''}" title="Toggle one-minute departure border">&#128276;</button><a class="travel-link" href="https://www.torn.com/travelagency.php" title="Open travel agency" aria-label="Open travel agency">&#9992;</a><br>
        Leave at: ${leavePending ? 'Pending' : `${leave.toLocaleTimeString()} (local)`}<br>
        Restock in: ${countdown(restock.at)}<br>
        Restock: ${new Date(restock.at).toLocaleTimeString()} | $${Number(restock.price).toLocaleString()}
      ` : 'No confirmed restock yet'}
    `;
    detail.innerHTML = `
      Expires: ${subscription.owner_access ? 'Never' : subscription.expires_at ? new Date(subscription.expires_at).toLocaleString() : 'Not paid'}<br>
      Last payment: ${subscription.last_payment_at ? new Date(subscription.last_payment_at).toLocaleString() : 'None'}<br>
      One-way flight minutes: <input id="pzMins" value="${flightMinutes}" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off"><br>
      <button id="pzPay">Send Xanax</button> <button id="pzRefresh">Refresh</button>
    `;

    document.querySelector('#pzBell')?.addEventListener('click', (event) => {
      event.stopPropagation();
      flightAlertEnabled = !flightAlertEnabled;
      set('flight_alert_enabled', flightAlertEnabled);
      render();
    });
    document.querySelector('#pzMins').addEventListener('change', (event) => {
      const value = Number(event.target.value);
      if (Number.isFinite(value) && value > 0) {
        set('flight_minutes', value);
      } else {
        event.target.value = duration();
      }
    });
    document.querySelector('#pzRefresh').addEventListener('click', refresh);
    document.querySelector('#pzUpdate')?.addEventListener('click', (event) => {
      event.stopPropagation();
      window.open(GREASY_FORK_SCRIPT_URL, '_blank', 'noopener');
    });
    document.querySelector('#pzPay').addEventListener('click', () => {
      GM_setClipboard(`Send 1 Xanax to ${RECIPIENT_ID} with message: Xanax Flight Timer`);
      location.href = 'https://www.torn.com/item.php#drugs';
    });
  }

  async function refresh() {
    if (!get('token', '')) {
      render();
      return;
    }

    try {
      status = await request('/api/status');
    } catch {
      status = null;
    }
    render();
  }

  refresh();
  checkForUpdate();
  setInterval(refresh, 30000);
  setInterval(() => {
    const focusedId = document.activeElement?.id;
    if (focusedId !== 'pzMins' && focusedId !== 'pzApiKey') render();
  }, 1000);
})();
