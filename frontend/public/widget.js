(function () {
  if (window.__zc_widget_loaded) return;
  window.__zc_widget_loaded = true;

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var token = script ? (script.getAttribute('data-token') || script.getAttribute('data-widget-token')) : null;
  var attrColor = script ? script.getAttribute('data-color') : null;
  var attrHeading = script ? script.getAttribute('data-heading') : null;
  var attrPosition = script ? script.getAttribute('data-position') : null;

  var API_HOST = script ? (script.getAttribute('data-host') || 'https://api.zinichat.com') : 'https://api.zinichat.com';

  function escapeHtml(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getVisitorId() {
    var vid = null;
    try {
      vid = localStorage.getItem('__zc_vid');
      if (!vid) {
        vid = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        localStorage.setItem('__zc_vid', vid);
      }
    } catch (e) {
      vid = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    }
    return vid;
  }

  function injectStyles() {
    if (document.getElementById('zc-widget-styles')) return;
    var style = document.createElement('style');
    style.id = 'zc-widget-styles';
    style.innerHTML = 
      '@media (max-width: 640px) {\n' +
      '  #zc-livechat-container {\n' +
      '    bottom: 12px !important;\n' +
      '    right: 12px !important;\n' +
      '    left: 12px !important;\n' +
      '  }\n' +
      '  #zc-chat-window {\n' +
      '    width: 100% !important;\n' +
      '    max-width: 100% !important;\n' +
      '    height: calc(100vh - 90px) !important;\n' +
      '    max-height: 540px !important;\n' +
      '    margin-bottom: 8px !important;\n' +
      '  }\n' +
      '}';
    (document.head || document.documentElement).appendChild(style);
  }

  function initLiveChatWidget(config) {
    injectStyles();
    var color = config.primaryColor || attrColor || '#7C3AED';
    var heading = config.heading || attrHeading || 'Chat with us';
    var tagline = config.tagline || 'We are here to help you.';
    var position = config.position || attrPosition || 'bottom-right';
    var greetingEnabled = config.greetingEnabled !== false;

    var container = document.createElement('div');
    container.id = 'zc-livechat-container';
    container.style.cssText = 'position:fixed; z-index:999999; bottom:20px; font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      (position === 'bottom-left' ? 'left:20px;' : 'right:20px;');

    // Chat Drawer Window
    var windowEl = document.createElement('div');
    windowEl.id = 'zc-chat-window';
    windowEl.style.cssText = 'width:340px; max-width:calc(100vw - 40px); height:460px; max-height:calc(100vh - 100px);' +
      ' background:#ffffff; border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.25);' +
      ' overflow:hidden; display:none; flex-direction:column; margin-bottom:12px;' +
      ' border:1px solid rgba(0,0,0,0.08); transition:all 0.3s ease;';

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'padding:14px 16px; background:' + color + '; color:#ffffff; display:flex; align-items:center; justify-content:space-between; shadow:0 2px 8px rgba(0,0,0,0.1);';
    
    var headerTitle = document.createElement('div');
    headerTitle.style.cssText = 'display:flex; align-items:center; gap:10px;';
    headerTitle.innerHTML = '<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;font-size:14px;">Z</div>' +
      '<div><div style="font-weight:700;font-size:13px;line-height:1.2;">' + escapeHtml(heading) + '</div><div style="font-size:11px;opacity:0.85;line-height:1.2;">' + escapeHtml(tagline) + '</div></div>';
    
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&#215;';
    closeBtn.style.cssText = 'background:none; border:none; color:#ffffff; font-size:22px; cursor:pointer; padding:0 4px; line-height:1; opacity:0.85;';
    closeBtn.onclick = function() {
      windowEl.style.display = 'none';
    };

    header.appendChild(headerTitle);
    header.appendChild(closeBtn);
    windowEl.appendChild(header);

    // Messages Container
    var messagesEl = document.createElement('div');
    messagesEl.id = 'zc-messages-list';
    messagesEl.style.cssText = 'flex:1; padding:14px; background:#f8fafc; overflow-y:auto; display:flex; flex-direction:column; gap:10px;';

    if (greetingEnabled) {
      var botMsg = document.createElement('div');
      botMsg.style.cssText = 'display:flex; gap:8px; align-items:flex-start;';
      botMsg.innerHTML = '<div style="width:24px;height:24px;border-radius:50%;background:' + color + ';color:#fff;font-size:10px;font-weight:bold;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">AI</div>' +
        '<div style="background:#ffffff; border:1px solid #e2e8f0; padding:10px 14px; border-radius:14px; border-top-left-radius:2px; font-size:12px; color:#1e293b; max-width:82%; box-shadow:0 1px 3px rgba(0,0,0,0.05); line-height:1.4;">' +
        'Hello! 👋 Welcome to our site. How can we help you today?</div>';
      messagesEl.appendChild(botMsg);
    }

    windowEl.appendChild(messagesEl);

    // Input Bar
    var inputForm = document.createElement('form');
    inputForm.style.cssText = 'padding:10px 12px; background:#ffffff; border-top:1px solid #f1f5f9; display:flex; align-items:center; gap:8px;';
    
    var inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'Type a message...';
    inputEl.style.cssText = 'flex:1; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:20px; padding:8px 14px; font-size:12px; outline:none; color:#0f172a;';

    var sendBtn = document.createElement('button');
    sendBtn.type = 'submit';
    sendBtn.style.cssText = 'background:' + color + '; border:none; width:32px; height:32px; border-radius:50%; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;';
    sendBtn.innerHTML = '<svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

    inputForm.onsubmit = function(e) {
      e.preventDefault();
      var text = inputEl.value.trim();
      if (!text || !token) return;

      // Render User Message UI immediately
      var userMsg = document.createElement('div');
      userMsg.style.cssText = 'display:flex; justify-content:flex-end;';
      userMsg.innerHTML = '<div style="background:' + color + '; color:#ffffff; padding:10px 14px; border-radius:14px; border-top-right-radius:2px; font-size:12px; max-width:82%; box-shadow:0 1px 3px rgba(0,0,0,0.1); line-height:1.4;">' +
        escapeHtml(text) + '</div>';
      messagesEl.appendChild(userMsg);
      inputEl.value = '';
      messagesEl.scrollTop = messagesEl.scrollHeight;

      var visitorId = getVisitorId();

      // Send message to real backend public endpoint
      var xhr = new XMLHttpRequest();
      xhr.open('POST', API_HOST + '/website-widget/public/message', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 201) {
            var statusEl = document.createElement('div');
            statusEl.style.cssText = 'font-size:10px; color:#94a3b8; text-align:right; margin-top:-4px; margin-bottom:4px;';
            statusEl.innerText = 'Sent ✓';
            messagesEl.appendChild(statusEl);
            messagesEl.scrollTop = messagesEl.scrollHeight;
          } else {
            var errEl = document.createElement('div');
            errEl.style.cssText = 'font-size:10px; color:#ef4444; text-align:right; margin-top:-4px; margin-bottom:4px;';
            errEl.innerText = 'Failed to send';
            messagesEl.appendChild(errEl);
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
        }
      };
      xhr.send(JSON.stringify({
        widgetToken: token,
        visitorId: visitorId,
        message: text
      }));
    };

    inputForm.appendChild(inputEl);
    inputForm.appendChild(sendBtn);
    windowEl.appendChild(inputForm);

    // Floating Button
    var btn = document.createElement('button');
    btn.id = 'zc-livechat-btn';
    btn.style.cssText = 'position:relative; display:flex; align-items:center; justify-content:center; width:56px; height:56px;' +
      ' border-radius:50%; background:' + color + '; color:#ffffff; border:none;' +
      ' box-shadow:0 10px 25px rgba(0,0,0,0.25); cursor:pointer; overflow:hidden; transition:transform 0.2s ease; margin-left:auto;';
    btn.innerHTML = '<svg style="width:26px;height:26px;fill:currentColor;" viewBox="0 0 24 24">' +
      '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
      '</svg>';

    btn.onclick = function() {
      if (windowEl.style.display === 'none' || !windowEl.style.display) {
        windowEl.style.display = 'flex';
      } else {
        windowEl.style.display = 'none';
      }
    };

    container.appendChild(windowEl);
    container.appendChild(btn);
    document.body.appendChild(container);
  }

  function initWidget(config) {
    if (config && config.type === 'WHATSAPP') {
      var phone = config.phoneNumber || config.whatsappNumber;
      if (!phone) return;
      var waUrl = 'https://wa.me/' + phone.replace(/[\s\-\+\(\)]/g, '');
      if (config.prefilledText) waUrl += '?text=' + encodeURIComponent(config.prefilledText);
      var color = config.primaryColor || attrColor || '#1F824A';
      var pos = config.position || attrPosition || 'bottom-right';

      var container = document.createElement('div');
      container.style.cssText = 'position:fixed; z-index:999999; bottom:20px;' + (pos === 'bottom-left' ? 'left:20px;' : 'right:20px;');
      var btn = document.createElement('a');
      btn.href = waUrl;
      btn.target = '_blank';
      btn.style.cssText = 'display:flex; align-items:center; justify-content:center; width:56px; height:56px; border-radius:50%; background:' + color + '; color:#fff; box-shadow:0 10px 25px rgba(0,0,0,0.25);';
      btn.innerHTML = '<svg style="width:30px;height:30px;fill:currentColor;" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>';
      container.appendChild(btn);
      document.body.appendChild(container);
    } else {
      initLiveChatWidget(config || {});
    }
  }

  if (token) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_HOST + '/website-widget/public/' + token, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            initWidget(data);
          } catch (e) {
            initLiveChatWidget({});
          }
        } else {
          initLiveChatWidget({});
        }
      }
    };
    xhr.send();
  } else {
    initLiveChatWidget({});
  }
})();
