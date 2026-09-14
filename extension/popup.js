(() => {
  "use strict";
  const config = TVerCaptionSettings;
  const slider = document.getElementById("percent");
  const toggle = document.getElementById("enabled");
  const value = document.getElementById("value");
  const status = document.getElementById("status");
  const reset = document.getElementById("reset");
  const appearanceButtons = [...document.querySelectorAll('[data-appearance]')];
  let settings = config.defaults;
  let pending = Promise.resolve();
  let version = 0;
  function render() {
    slider.value = settings.percent;
    slider.disabled = !settings.enabled;
    toggle.checked = settings.enabled;
    appearanceButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.appearance === settings.appearance));
    });
    value.replaceChildren(document.createTextNode(String(settings.percent)), Object.assign(document.createElement("span"), {textContent: "％"}));
  }
  function save(patch) {
    settings = config.normalize({ ...settings, ...patch });
    render();
    const snapshot = { ...settings };
    const currentVersion = ++version;
    status.textContent = "保存中…";
    // Serialize writes so fast slider movements cannot leave an older value saved.
    pending = pending.catch(() => {}).then(() => chrome.storage.local.set({ captionSettings: snapshot }));
    pending.then(() => {
      if (currentVersion === version) status.textContent = "保存しました · 開いているTVerにも反映";
    }).catch(() => { if (currentVersion === version) status.textContent = "保存できませんでした。拡張機能を開き直してください。"; });
  }
  slider.addEventListener("input", () => save({ percent: Number(slider.value) }));
  toggle.addEventListener("change", () => save({ enabled: toggle.checked }));
  reset.addEventListener("click", () => save({ percent: 100 }));
  appearanceButtons.forEach(button => {
    button.addEventListener('click', () => save({ appearance: button.dataset.appearance }));
  });
  chrome.storage.local.get({ captionSettings: config.defaults }).then(data => {
    settings = config.normalize(data.captionSettings);
    toggle.disabled = false;
    reset.disabled = false;
    appearanceButtons.forEach(button => { button.disabled = false; });
    render();
    status.textContent = "設定は自動保存されます";
  }).catch(() => { status.textContent = "設定を読み込めません。拡張機能を開き直してください。"; });
})();

