(async () => {
  const results = [];
  const settle = () => new Promise(resolve => setTimeout(resolve, 50));
  const near = (a, b) => Math.abs(a - b) < 1;
  const center = element => {
    const rect = element.getBoundingClientRect();
    return rect.left + rect.width / 2;
  };
  const check = (name, condition) => {
    results.push(condition);
    const li = document.createElement('li');
    li.textContent = `${condition ? 'PASS' : 'FAIL'} — ${name}`;
    document.getElementById('results').append(li);
    document.getElementById('summary').textContent = `${results.filter(Boolean).length}/${results.length} PASS`;
  };
  const save = async (percent, enabled = true, appearance = 'standard') => {
    await chrome.storage.local.set({captionSettings: {percent, enabled, appearance}});
    await settle();
  };
  const cue = () => document.querySelector('.vjs-text-track-cue');
  const lines = () => [...cue().children];
  const font = () => parseFloat(getComputedStyle(lines()[0]).fontSize);
  const stacked = () => lines()[1].getBoundingClientRect().top >= lines()[0].getBoundingClientRect().bottom - 1;
  const centered = () => lines().every(line => near(center(line.firstElementChild), center(cue().parentElement)));
  let player = document.getElementById('player');
  await settle();
  const originalMarkup = cue().outerHTML;
  const videoBase = document.querySelector('video').getBoundingClientRect().width;
  const bodySize = getComputedStyle(document.getElementById('outside')).fontSize;
  check('標準状態は2行の字幕', stacked());
  const oldStyle = document.createElement('style');
  oldStyle.textContent = '.vjs-text-track-cue > div { display:inline-block !important; max-width:100% !important; scale:0.8 !important; transform-origin:center bottom !important; }';
  document.head.append(oldStyle);
  check('旧版のCSSで2行が横並びになる不具合を再現', near(lines()[0].getBoundingClientRect().top, lines()[1].getBoundingClientRect().top));
  oldStyle.remove();
  for (const percent of [10, 50, 80, 100, 150, 200]) {
    await save(percent);
    check(`${percent}％で文字サイズが正しい`, near(font(), 24 * percent / 100));
    check(`${percent}％でも2行が縦に並ぶ`, stacked());
    check(`${percent}％でも各行が中央`, centered());
    check(`${percent}％でも行間が文字サイズに追従`, near(lines()[0].getBoundingClientRect().height, 24 * percent / 100 * 1.55));
  }
  check('動画のサイズは変わらない', document.querySelector('video').getBoundingClientRect().width === videoBase);
  check('本文サイズは変わらない', getComputedStyle(document.getElementById('outside')).fontSize === bodySize);
  check('字幕の配置用枠を変形しない', getComputedStyle(cue()).scale === 'none');
  await save(80);
  cue().replaceWith(cue().cloneNode(true));
  await settle();
  check('字幕切り替え後も80％・2行を維持', near(font(), 19.2) && stacked());
  const copy = player.cloneNode(true);
  player.replaceWith(copy);
  player = copy;
  await settle();
  check('プレイヤー再生成後も80％・2行を維持', near(font(), 19.2) && stacked());
  // Use the actual two-block TVer structure and its inline size updates.
  const resizePlayer = (width, sourceFont) => {
    player.style.width = `${width}px`;
    cue().style.width = `${width}px`;
    cue().style.height = `${sourceFont * 1.55 * 2}px`;
    lines().forEach(line => { line.style.fontSize = `${sourceFont}px`; });
  };
  for (const [width, size] of [[1176, 46.31], [1920, 72], [640, 24]]) {
    resizePlayer(width, size);
    await settle();
    check(`幅${width}pxで元フォント変更に追従`, near(font(), size * .8));
    check(`幅${width}pxでも2行と中央を維持`, stacked() && centered());
    check(`幅${width}pxで字幕全体の高さも縮小`, near(cue().getBoundingClientRect().height, size * .8 * 1.55 * 2));
  }
  const rawStyle = lines()[0].getAttribute('style');
  lines()[0].style.color = 'yellow';
  await settle();
  check('繰り返し更新しても倍率が累積しない', near(font(), 19.2));
  lines()[0].setAttribute('style', rawStyle);
  // Revert source layout before checking complete cleanup.
  const restored = document.createElement('div');
  restored.innerHTML = originalMarkup;
  cue().replaceWith(restored.firstElementChild);
  await settle();
  await save(80, false);
  check('無効化で元のHTML・スタイルを完全復元', cue().outerHTML === originalMarkup);
  await save(80);
  await save(100);
  check('100％で元のHTML・スタイルを完全復元', cue().outerHTML === originalMarkup);
  await save(900);
  check('旧設定の上限を200％に制限', near(font(), 48));
  await save(0);
  check('下限を10％に制限', near(font(), 2.4));
  await save(80);
  const iframe = document.querySelector('iframe');
  const spanStyle = () => getComputedStyle(lines()[0].firstElementChild);
  const standardBackground = spanStyle().backgroundColor;
  const standardColor = spanStyle().color;
  await save(80, true, 'transparent');
  check('背景なしは透明で文字色を維持', spanStyle().backgroundColor === 'rgba(0, 0, 0, 0)' && spanStyle().color === standardColor);
  check('背景なしでも2行と中央を維持', stacked() && centered());
  await save(80, true, 'black-on-transparent');
  check('削除された黒文字設定は標準に戻る', TVerCaptionSettings.normalize({appearance: 'black-on-transparent'}).appearance === 'standard');
  await save(100, true, 'yellow-on-black');
  check('黒背景は不透明な真っ黒、文字は黄色', spanStyle().backgroundColor === 'rgb(0, 0, 0)' && spanStyle().color === 'rgb(255, 255, 0)');
  check('黒背景を字幕の文字部分だけに適用', getComputedStyle(lines()[0]).backgroundColor === 'rgba(0, 0, 0, 0)');
  await save(80, false, 'yellow-on-black');
  check('サイズ変更が無効でも配色は適用', near(font(), 24) && spanStyle().color === 'rgb(255, 255, 0)');
  cue().replaceWith(cue().cloneNode(true));
  await settle();
  check('字幕更新後も黒背景と黄色文字を維持', spanStyle().backgroundColor === 'rgb(0, 0, 0)' && spanStyle().color === 'rgb(255, 255, 0)');
  await save(80, true, 'standard');
  check('標準に戻すと元の背景と文字色を復元', spanStyle().backgroundColor === standardBackground && spanStyle().color === standardColor);
  await chrome.storage.local.set({captionSettings: {percent:80, enabled:true}});
  await settle();
  check('旧版の保存設定は標準配色として読み込む', spanStyle().backgroundColor === standardBackground && near(font(), 19.2));
  if (!iframe.contentDocument.querySelector('#enabled') || iframe.contentDocument.querySelector('#enabled').disabled) {
    await new Promise(resolve => iframe.addEventListener('load', resolve, {once:true}));
  }
  const doc = iframe.contentDocument;
  const slider = doc.querySelector('#percent');
  check('操作画面は10〜200％、表示例・プリセットなし', slider.min === '10' && slider.max === '200' && !doc.querySelector('.preview, [data-percent]'));
  slider.value = '10';
  slider.dispatchEvent(new iframe.contentWindow.Event('input', {bubbles:true}));
  await settle();
  check('スライダーの値を保存できる', (await iframe.contentWindow.chrome.storage.local.get({})).captionSettings.percent === 10);
  doc.querySelector('#reset').click();
  await settle();
  check('リセットで100％を保存できる', (await iframe.contentWindow.chrome.storage.local.get({})).captionSettings.percent === 100);
  const appearance = doc.querySelector('[data-appearance="yellow-on-black"]');
  for (const mode of ['transparent', 'standard', 'yellow-on-black']) {
    doc.querySelector(`[data-appearance="${mode}"]`).click();
    await settle();
    check(`${mode}を1クリックで保存`, (await iframe.contentWindow.chrome.storage.local.get({})).captionSettings.appearance === mode);
    check(`${mode}だけ選択中として表示`, doc.querySelectorAll('[data-appearance][aria-pressed="true"]').length === 1 && doc.querySelector(`[data-appearance="${mode}"]`).getAttribute('aria-pressed') === 'true');
  }
  check('CCロゴに同じアイコン画像を使用', doc.querySelector('img.badge')?.getAttribute('src') === 'icons/icon-128.png' && doc.querySelector('img.badge').naturalWidth === 128);
  doc.querySelector('#reset').click();
  await settle();
  check('サイズのリセットで配色を変更しない', (await iframe.contentWindow.chrome.storage.local.get({})).captionSettings.appearance === 'yellow-on-black');
  doc.querySelector('#enabled').click();
  await settle();
  check('サイズ変更をオフにしても配色を選べる', !appearance.disabled);
  document.getElementById('fullscreen').onclick = () => player.requestFullscreen();
  document.getElementById('exit-fullscreen').onclick = () => document.exitFullscreen();
  document.addEventListener('fullscreenchange', async () => {
    const fullscreen = !!document.fullscreenElement;
    resizePlayer(fullscreen ? player.clientWidth : 640, fullscreen ? 46.31 : 24);
    await settle();
    check(`全画面${fullscreen ? '開始' : '終了'}で2行・中央・80％を維持`, stacked() && centered() && near(font(), (fullscreen ? 46.31 : 24) * .8));
  });
})();
