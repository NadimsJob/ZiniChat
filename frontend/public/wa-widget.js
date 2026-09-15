(function () {
  if (window.__zc_wa_widget_loaded) return;
  window.__zc_wa_widget_loaded = true;

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var token = script ? script.getAttribute('data-token') : null;
  var attrPhone = script ? script.getAttribute('data-phone') : null;
  var attrColor = script ? script.getAttribute('data-color') : null;
  var attrText = script ? script.getAttribute('data-text') : null;
  var attrPosition = script ? script.getAttribute('data-position') : null;

  var API_HOST = 'https://api.zinichat.com';

  function initWidget(config) {
    if (!config || !config.phoneNumber) return;

    var phone = config.phoneNumber.replace(/[\s\-\+\(\)]/g, '');
    if (phone.startsWith('0')) phone = '88' + phone;

    var color = config.buttonColor || config.primaryColor || '#1F824A';
    var text = config.prefilledText || '';
    var position = config.position || 'bottom-right';
    var customIcon = config.customIconUrl || null;
    var tooltip = config.tooltipText || config.tooltipTextBn || config.tooltipTextEn || 'Chat on WhatsApp';

    var waUrl = 'https://wa.me/' + phone;
    if (text) {
      waUrl += '?text=' + encodeURIComponent(text);
    }

    // Container
    var container = document.createElement('div');
    container.id = 'zc-wa-float-container';
    container.style.cssText = 'position:fixed; z-index:999999; bottom:20px; font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; display:flex; flex-direction:column; align-items:flex-end; pointer-events:none;' +
      (position === 'bottom-left' ? 'left:20px;' : 'right:20px;');

    // Tooltip
    var tooltipEl = document.createElement('div');
    tooltipEl.style.cssText = 'position:absolute; bottom:70px; ' + (position === 'bottom-left' ? 'left:0;' : 'right:0;') +
      ' background:#18181b; color:#ffffff; font-size:12px; font-weight:500; padding:8px 12px; border-radius:10px;' +
      ' box-shadow:0 10px 25px rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); white-space:nowrap;' +
      ' opacity:0; transform:translateY(6px); transition:all 0.3s ease; pointer-events:none;';
    tooltipEl.innerText = tooltip;

    // Pulse Ring
    var ring = document.createElement('div');
    ring.style.cssText = 'position:absolute; inset:-4px; border-radius:50%; background:' + color + ';' +
      ' opacity:0.4; animation:zc-wa-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events:none;';

    // Inject CSS keyframes & mobile responsiveness
    var style = document.createElement('style');
    style.innerHTML = '#zc-wa-float-container, #zc-wa-float-container * { box-sizing: border-box !important; }\n' +
      '@keyframes zc-wa-ping { 75%, 100% { transform: scale(1.4); opacity: 0; } }\n' +
      ' #zc-wa-float-container > * { pointer-events: auto !important; }\n' +
      ' #zc-wa-btn:hover { transform: scale(1.08); }\n' +
      ' @media (max-width: 640px) {\n' +
      '   #zc-wa-float-container { position: fixed !important; bottom: 16px !important; bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important; right: 16px !important; left: auto !important; z-index: 999998 !important; margin: 0 !important; width: auto !important; max-width: calc(100vw - 32px) !important; }\n' +
      '   #zc-wa-btn { width: 52px !important; height: 52px !important; margin: 0 !important; flex-shrink: 0 !important; }\n' +
      ' }';
    document.head.appendChild(style);

    // Main Button
    var btn = document.createElement('a');
    btn.id = 'zc-wa-btn';
    btn.href = waUrl;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('aria-label', 'Chat on WhatsApp');
    btn.style.cssText = 'position:relative; display:flex; align-items:center; justify-center; width:56px; height:56px;' +
      ' border-radius:50%; background:' + color + '; color:#ffffff; text-decoration:none;' +
      ' box-shadow:0 10px 25px rgba(0,0,0,0.25); transition:transform 0.2s ease; cursor:pointer; overflow:hidden;';

    if (customIcon) {
      var iconImg = document.createElement('img');
      var iconSrc = customIcon.startsWith('http') ? customIcon : API_HOST + customIcon;
      iconImg.src = iconSrc;
      iconImg.alt = 'WhatsApp';
      iconImg.style.cssText = 'width:30px; height:30px; object-fit:contain; border-radius:50%; margin:auto;';
      btn.appendChild(iconImg);
    } else {
      btn.innerHTML = '<svg style="width:30px;height:30px;fill:currentColor;margin:auto;display:block;" viewBox="0 0 24 24">' +
        '<path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>' +
        '</svg>';
    }

    container.appendChild(ring);
    container.appendChild(btn);
    container.appendChild(tooltipEl);

    function safeAppend(el) {
      if (document.body) {
        document.body.appendChild(el);
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          if (document.body) document.body.appendChild(el);
        });
      }
    }
    safeAppend(container);

    // Hover interactions
    container.addEventListener('mouseenter', function () {
      tooltipEl.style.opacity = '1';
      tooltipEl.style.transform = 'translateY(0)';
    });

    container.addEventListener('mouseleave', function () {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.transform = 'translateY(6px)';
    });

    // Auto-show tooltip briefly after load
    setTimeout(function () {
      tooltipEl.style.opacity = '1';
      tooltipEl.style.transform = 'translateY(0)';
      setTimeout(function () {
        tooltipEl.style.opacity = '0';
        tooltipEl.style.transform = 'translateY(6px)';
      }, 3500);
    }, 2000);
  }

  // Load from API token if token provided
  if (token) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_HOST + '/website-widget/public/' + token, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          initWidget(data);
        } catch (e) {
          console.error('Invalid widget response');
        }
      }
    };
    xhr.send();
  } else if (attrPhone) {
    // Direct attribute initialization
    initWidget({
      phoneNumber: attrPhone,
      buttonColor: attrColor || '#1F824A',
      prefilledText: attrText || '',
      position: attrPosition || 'bottom-right'
    });
  }
})();
