/* 轮询线上地址，构建完成后自动校验页面与全部静态资源 */
const BASE = 'https://kaqka5.github.io/mathviz/';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function head(url) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    return { ok: r.ok, status: r.status, text: () => r.text(), headers: r.headers };
  } catch (e) {
    return { ok: false, status: 0, err: e.message };
  }
}

(async () => {
  let html = null, status = 0;
  for (let i = 1; i <= 20; i++) {
    const r = await head(BASE);
    status = r.status;
    if (r.ok) { html = await r.text(); break; }
    console.log(`第 ${i} 次尝试：HTTP ${r.status}${r.err ? ' (' + r.err + ')' : ''} —— 等待 12 秒后重试…`);
    await sleep(12000);
  }

  if (!html) {
    console.log(`\n❌ 暂时还拿不到页面（最后一次 HTTP ${status}）。可能还在构建，或者需要等 GitHub 首次发布（有时 2-5 分钟）。`);
    process.exitCode = 2;
    return;
  }

  console.log(`\n✅ 线上首页可访问：HTTP 200，${html.length} 字节`);
  console.log('   页面标题包含「数学题图解工坊」：', html.includes('数学题图解工坊'));

  const srcs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
    .filter(u => !/^https?:|^#|^mailto:/.test(u));
  console.log(`   相对资源 ${srcs.length} 个，逐个校验…`);

  let bad = 0;
  for (const a of srcs) {
    const url = new URL(a, BASE).href;
    const r = await head(url);
    const ct = r.headers ? (r.headers.get('content-type') || '') : '';
    if (!r.ok) { console.log(`   ✗ ${a} → HTTP ${r.status}`); bad++; }
    else if (/\.js$/.test(a) && !/javascript/.test(ct)) { console.log(`   ⚠ ${a} → Content-Type=${ct}`); bad++; }
  }
  console.log(bad === 0 ? `   ✅ 全部 ${srcs.length} 个资源都是 200 且类型正确` : `   ❌ 有 ${bad} 个资源异常`);

  // 抽查关键文件
  for (const a of ['js/ui/app.js', 'js/ai/client.js', 'js/scenes/conic2d.js', 'css/styles.css', 'js/ai/samples.js']) {
    const r = await head(new URL(a, BASE).href);
    console.log(`   ${a.padEnd(24)} → HTTP ${r.status}  ${r.headers ? r.headers.get('content-type') : ''}`);
  }
})();
