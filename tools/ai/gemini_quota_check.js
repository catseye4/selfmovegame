// Gemini 그림 한도 확인·계정 고르기 (Claude in Chrome의 javascript_tool로 붙여 넣어 실행) — MD/AI_분업_가이드.md 2절 "계정 전환"
//
// 같은 크롬에 Google 계정이 여럿 로그인돼 있으면 주소의 /u/0/, /u/1/ … 로 계정을 고른다 (비밀번호 입력 없음).
// 번호는 로그인 순서라 바뀔 수 있고, 쓰면 안 되는 다른 계정도 섞여 있음 → 번호가 아니라 **계정 이름**으로 찾는다.
// 실행 전에 Claude가 쓸 계정을 순서대로 넣는다 (메일 @ 앞부분, 공개 저장소라 여기에는 적지 않음 — 목록은 Claude 메모리):
//   window.__claudeGeminiAccounts = ['첫째', '둘째'];
// 하루 약 30장을 넘기면 모델이 Flash-Lite로 내려가 "이미지 만들기"가 사라짐 → 그때 목록의 다음 계정으로 옮긴다.
// 돌려주는 값: { account, allowed, imageMenu, limited, limitText, next, slots }
//   - allowed가 false면 쓰면 안 되는 계정 → next(목록 첫 계정)로 이동.
//   - limited가 true면 next(다음 계정 새 대화)로 가서 같은 프롬프트·첨부를 다시. next가 null이면 모든 계정 한도 → 멈추고 보고.
//   - imageMenu가 null이면 메뉴를 못 찾은 것 (새 대화 직후 덜 그려짐) → 2~3초 뒤 다시.
//   - 이동한 뒤에는 이 스크립트를 한 번 더 돌려 account가 맞는지 확인.
//   - slots는 목록에 있는 계정의 번호만 (다른 계정 이름은 돌려주지 않음). window.__claudeGeminiScan = true면 한도가 아니어도 찾음.
await (async () => {
    const ACCOUNTS = window.__claudeGeminiAccounts || [];
    const MAX_SLOT = 8;
    const userOf = html => ((html || '').match(/\(([a-z0-9._-]+)@gmail\.com\)/i) || (html || '').match(/([a-z0-9._-]+)@gmail\.com/i) || [, null])[1];
    const acc = document.querySelector('a[aria-label*="Google 계정"], a[aria-label*="Google Account"]');
    const account = acc ? userOf(acc.getAttribute('aria-label')) : null;
    const allowed = ACCOUNTS.includes(account);

    const btn = document.querySelector('button[aria-label*="업로드 및 도구"]');
    let imageMenu = null;
    if (btn) {
        btn.click();
        await new Promise(r => setTimeout(r, 1200));
        const items = [...document.querySelectorAll('[role=menuitem], [role=menuitemcheckbox]')];
        if (items.length) imageMenu = items.some(e => /이미지 만들기|Create image/i.test(e.innerText));
        btn.click();                                   // 메뉴 닫기 (같은 버튼을 다시 누름)
    }
    // 마지막 답에 한도 안내가 있으면 (그림 대신 "한도에 도달" 같은 글)
    const last = [...document.querySelectorAll('model-response')].pop();
    const m = last && last.innerText.match(/[^.\n]*(한도|사용량|limit|Flash-Lite)[^.\n]*/i);
    const limited = imageMenu === false || !!m;

    // 목록 계정의 번호 찾기 (필요할 때만 — 각 /u/N/app을 불러 그 쪽 계정 이름을 봄)
    let slots = null, next = '';
    if (!allowed || limited || window.__claudeGeminiScan) {
        slots = {};
        for (let n = 0; n < MAX_SLOT; n++) {
            try {
                const r = await fetch(`/u/${n}/app`, { credentials: 'include' });
                if (!r.ok || !new URL(r.url).pathname.startsWith(`/u/${n}/`)) break;   // 없는 번호면 다른 곳으로 넘어감
                const u = userOf(await r.text());
                if (ACCOUNTS.includes(u) && !(u in slots)) slots[u] = n;
            } catch (e) { break; }
        }
        const want = !allowed ? ACCOUNTS[0] : ACCOUNTS[ACCOUNTS.indexOf(account) + 1];
        next = want && want in slots ? `https://gemini.google.com/u/${slots[want]}/app` : null;
    }
    return {
        account, allowed, imageMenu, limited,
        limitText: m ? m[0].trim().slice(0, 160) : '',
        next, slots
    };
})()
