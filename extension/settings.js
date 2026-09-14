(() => {
  "use strict";
  globalThis.TVerCaptionSettings = Object.freeze({
    defaults: Object.freeze({ enabled: true, percent: 100, appearance: 'standard' }),
    normalize(value = {}) {
      const number = Number(value.percent);
      return {
        enabled: value.enabled !== false,
        percent: Number.isFinite(number) && value.percent != null
          ? Math.min(200, Math.max(10, Math.round(number / 5) * 5)) : 100,
        appearance: ['transparent', 'yellow-on-black'].includes(value.appearance) ? value.appearance : 'standard'
      };
    }
  });
})();

