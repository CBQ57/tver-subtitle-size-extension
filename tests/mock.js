// Test-only storage adapter; never included in the packaged extension.
(() => {
  const listeners = [];
  let data = {};
  window.chrome ??= {};
  window.chrome.storage = {
    local: {
      async get(defaults) { return { ...defaults, ...data }; },
      async set(next) {
        const oldValue = data.captionSettings;
        data = { ...data, ...structuredClone(next) };
        listeners.forEach(fn => fn({captionSettings: {oldValue, newValue: data.captionSettings}}, "local"));
      }
    },
    onChanged: { addListener(fn) { listeners.push(fn); } }
  };
})();
