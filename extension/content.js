(() => {
  "use strict";
  const config = TVerCaptionSettings;
  const style = document.createElement("style");
  style.id = "tver-caption-size-extension-style";
  let revision = 0;
  let settings = config.defaults;
  const lineSelector = '.video-js .vjs-text-track-display .vjs-text-track-cue > .vjs-text-track-cue-line';
  const fontProperty = '--tver-caption-font-size';
  const cueAttribute = 'data-tver-caption-auto-height';
  const trackedLines = new Set();
  const trackedCues = new Set();

  function refresh() {
    const active = settings.enabled && settings.percent !== 100;
    const lines = new Set(active ? document.querySelectorAll(lineSelector) : []);
    const cues = new Set();
    for (const line of trackedLines) {
      if (!lines.has(line)) {
        line.style.removeProperty(fontProperty);
        trackedLines.delete(line);
      }
    }
    for (const line of lines) {
      // TVer writes the unmodified font size inline on each line. Read that source,
      // never the computed (already resized) value, so updates cannot compound.
      const size = /^([\d.]+)px$/.exec(line.style.fontSize.trim());
      if (!size || !Number.isFinite(Number(size[1]))) {
        line.style.removeProperty(fontProperty);
        trackedLines.delete(line);
        continue;
      }
      const fontSize = `${Number(size[1]) * settings.percent / 100}px`;
      if (line.style.getPropertyValue(fontProperty) !== fontSize) {
        line.style.setProperty(fontProperty, fontSize);
      }
      trackedLines.add(line);
      const cue = line.parentElement;
      // TVer's bottom-anchored captions have a cached pixel height. Let their
      // natural multiline height follow the font size while preserving bottom.
      if (cue.style.bottom && cue.style.bottom !== 'auto' && (!cue.style.top || cue.style.top === 'auto')) {
        cues.add(cue);
        if (!cue.hasAttribute(cueAttribute)) cue.setAttribute(cueAttribute, '');
        trackedCues.add(cue);
      }
    }
    for (const cue of trackedCues) {
      if (!cues.has(cue)) {
        cue.removeAttribute(cueAttribute);
        trackedCues.delete(cue);
      }
    }
  }

  function apply(raw) {
    settings = config.normalize(raw);
    // Size and appearance are independent; 100% removes only the size override.
    // Preserve block lines, spans, ruby and alignment. Do not transform or change
    // display: each line must keep its own original line break and text layout.
    style.textContent = settings.enabled && settings.percent !== 100 ? `
      ${lineSelector}[style*="${fontProperty}:"] {
        font-size: var(${fontProperty}) !important;
      }
      .video-js .vjs-text-track-display .vjs-text-track-cue[${cueAttribute}] {
        height: auto !important;
      }
    ` : "";
    if (settings.appearance !== 'standard') {
      // Clear every original caption background, without changing block layout.
      style.textContent += `
        .video-js .vjs-text-track-display .vjs-text-track-cue,
        .video-js .vjs-text-track-display .vjs-text-track-cue * {
          background: transparent !important;
        }
      `;
      if (settings.appearance === 'yellow-on-black') {
        // TVer paints the background on each line's direct span, not the full
        // width line box. Keep black confined to those existing text boxes.
        style.textContent += `
          ${lineSelector}, ${lineSelector} * {
            color: #ffff00 !important;
            fill: #ffff00 !important;
          }
          ${lineSelector} > span {
            background: #000000 !important;
          }
        `;
      }
    }
    if (!style.isConnected) (document.head || document.documentElement).append(style);
    refresh();
  }

  const observer = new MutationObserver(records => {
    if (records.some(record => {
      if (record.target === style || record.target.parentNode === style) return false;
      if (record.type === 'attributes') return record.target.matches?.('.vjs-text-track-cue, .vjs-text-track-cue-line');
      return [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 &&
        (node.matches('.vjs-text-track-cue, .vjs-text-track-cue-line') || node.querySelector('.vjs-text-track-cue')));
    })) refresh();
  });
  observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class']});

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.captionSettings) {
      revision++;
      apply(changes.captionSettings.newValue);
    }
  });
  const initialRevision = revision;
  chrome.storage.local.get({ captionSettings: config.defaults }).then(data => {
    if (revision === initialRevision) apply(data.captionSettings);
  }).catch(() => apply(config.defaults));
  // MutationObserver follows the player's new inline font sizes on resize,
  // fullscreen, cue replacement and SPA navigation. Own style writes are idempotent.
})();
