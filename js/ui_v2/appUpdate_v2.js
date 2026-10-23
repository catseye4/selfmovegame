/* ==========================================================================
   PROJECT: MAD OVERLORD // 앱 업데이트 확인 (D-074)
   Android 앱(Capacitor)에서만: GitHub 릴리스의 최신 버전(태그 vX.Y.Z)을 읽어 지금 버전(version_v2.js)보다 새것이면
   "새 버전" 창 → [업데이트] → 앱 안에서 APK를 받고(진행 막대) Android 설치 화면을 연다 (네이티브 플러그인 AppUpdate).
   - 릴리스 이름이나 설명에 [필수]가 있으면 [나중에] 없이 업데이트만.
   - 인터넷이 없거나 릴리스가 없으면 조용히 넘어감 (설정 창의 "업데이트 확인"은 결과를 알려 줌).
   - 시험용: window.madOverlordUpdateFeed에 다른 주소를 넣으면 그 JSON(GitHub API와 같은 모양)을 읽는다.
   ========================================================================== */

import { VERSION, BUILD, RELEASE_REPO } from '../version_v2.js';
import { sound } from '../engine_v2/audio/sound_v2.js';

const TIMEOUT_MS = 8000;

/** 앱 안인가 (웹 브라우저면 false) */
export function isApp() {
    return !!window.madOverlordApp && !!window.Capacitor;
}

/** 'v0.2.1' · '0.2.1-b3' → [0, 2, 1] 끼리 비교: a가 더 새것이면 1, 같으면 0, 옛것이면 -1 */
export function compareVersions(a, b) {
    const parse = v => String(v).replace(/^v/i, '').split(/[-+ ]/)[0].split('.').map(n => parseInt(n, 10) || 0);
    const x = parse(a), y = parse(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
        const d = (x[i] || 0) - (y[i] || 0);
        if (d) return d > 0 ? 1 : -1;
    }
    return 0;
}

/** 최신 릴리스 { version, name, notes, url, size, required } 또는 null (릴리스 없음·인터넷 없음) */
export async function fetchLatest() {
    const feed = window.madOverlordUpdateFeed || `https://api.github.com/repos/${RELEASE_REPO}/releases/latest`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(feed, { signal: ctl.signal, headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
        if (!res.ok) return null;
        const r = await res.json();
        const apk = (r.assets || []).find(a => /\.apk$/i.test(a.name));
        if (!r.tag_name || !apk) return null;
        return {
            version: String(r.tag_name).replace(/^v/i, ''),
            name: r.name || r.tag_name,
            notes: String(r.body || '').trim(),
            url: apk.browser_download_url,
            fileName: apk.name,
            size: apk.size || 0,
            required: /\[필수\]/.test(`${r.name || ''} ${r.body || ''}`)
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * 새 버전 확인. silent면 새 버전이 있을 때만 창을 띄움 (앱 시작 때),
 * 아니면 "최신 버전" / "확인할 수 없음"도 알려 줌 (설정 창 버튼). 돌려주는 값: 'update' | 'latest' | 'offline' | 'web'
 */
export async function checkForUpdate({ silent = true, onStatus } = {}) {
    if (!isApp()) return 'web';
    onStatus?.('확인 중…');
    const latest = await fetchLatest();
    if (!latest) {
        onStatus?.('업데이트 정보를 받을 수 없음 (인터넷·릴리스 확인)');
        return 'offline';
    }
    if (compareVersions(latest.version, VERSION) <= 0) {
        onStatus?.(`최신 버전입니다 (${VERSION})`);
        return 'latest';
    }
    onStatus?.(`새 버전 ${latest.version}이 있습니다`);
    showUpdateDialog(latest);
    return 'update';
}

function mb(n) {
    return n ? `${(n / 1048576).toFixed(0)}MB` : '';
}

function showUpdateDialog(info) {
    if (document.querySelector('.v2-update')) return;
    const el = document.createElement('div');
    el.className = 'v2-update';
    const notes = info.notes.split('\n').slice(0, 12).join('\n');
    el.innerHTML = `
        <div class="v2-update__panel v2-panel" role="dialog" aria-label="새 버전">
            <div class="v2-hazard v2-update__stripe"></div>
            <h2>UPDATE <small>새 버전이 있습니다</small></h2>
            <p class="v2-update__ver"><span>지금 <b>${VERSION}</b> (빌드 ${BUILD})</span><i>→</i><span>새 버전 <b class="is-new"></b></span></p>
            <pre class="v2-update__notes"></pre>
            <div class="v2-update__bar" hidden><i></i></div>
            <p class="v2-update__status" aria-live="polite"></p>
            <div class="v2-update__actions">
                ${info.required ? '' : '<button class="v2-btn v2-btn--ghost" data-act="later">나중에</button>'}
                <button class="v2-btn" data-act="go">업데이트 ${mb(info.size)}</button>
            </div>
        </div>`;
    el.querySelector('.is-new').textContent = info.version;
    el.querySelector('.v2-update__notes').textContent = notes || info.name;
    document.body.appendChild(el);
    const bar = el.querySelector('.v2-update__bar');
    const fill = bar.querySelector('i');
    const status = el.querySelector('.v2-update__status');
    const go = el.querySelector('[data-act="go"]');
    el.querySelector('[data-act="later"]')?.addEventListener('click', () => { sound.play('ui_click'); el.remove(); });
    go.addEventListener('click', async () => {
        sound.play('ui_click');
        go.disabled = true;
        const plugin = window.Capacitor?.Plugins?.AppUpdate;
        if (!plugin) {   // 플러그인이 없는 옛 앱: 브라우저로 받기
            window.open(info.url, '_blank');
            status.textContent = '브라우저에서 내려받은 뒤 파일을 눌러 설치하세요.';
            go.disabled = false;
            return;
        }
        bar.hidden = false;
        status.textContent = '내려받는 중…';
        const sub = await plugin.addListener('progress', p => {
            const k = p.total > 0 ? p.done / p.total : 0;
            fill.style.width = `${Math.round(k * 100)}%`;
            status.textContent = `내려받는 중… ${Math.round(k * 100)}% (${mb(p.done)} / ${mb(p.total)})`;
        });
        try {
            const r = await plugin.download({ url: info.url, fileName: info.fileName || `MadOverlord-${info.version}.apk` });
            if (r.status === 'needPermission') {
                status.textContent = '설정에서 "이 출처 허용"을 켠 뒤 돌아와 [업데이트]를 다시 누르세요.';
            } else {
                fill.style.width = '100%';
                status.textContent = '설치 화면에서 [업데이트]를 누르면 끝납니다.';
            }
        } catch (e) {
            status.textContent = `내려받지 못했습니다: ${e?.message || e}`;
        } finally {
            sub?.remove?.();
            go.disabled = false;
        }
    });
}
