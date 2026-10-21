// Gemini 웹에 참고 그림을 첨부할 때 쓰는 가로채기 (Claude in Chrome의 javascript_tool로 붙여 넣어 실행)
//
// Gemini는 "업로드 및 도구 → 파일 업로드"를 누른 순간에야 파일 입력칸을 만들고 바로 파일 선택 창을 띄운다.
// 선택 창은 웹페이지 밖이라 Claude가 조작할 수 없으므로, 그 순간 창 대신 입력칸을 남겨 둔다:
//   1) 이 파일을 실행 → 2) "파일 업로드" 메뉴 클릭 → 3) find("claude-upload-input")로 입력칸 ref를 찾아
//   file_upload(ref, [그림 경로]) → 4) window.__claudeHookRestore() 로 원래대로
(() => {
  if (window.__claudeHook) return 'already hooked';
  const origClick = HTMLInputElement.prototype.click;
  const origPicker = HTMLInputElement.prototype.showPicker;
  const origFsa = window.showOpenFilePicker;
  const keep = (el) => {
    el.setAttribute('aria-label', 'claude-upload-input');
    if (!el.isConnected) { el.style.display = 'none'; document.body.appendChild(el); }
    window.__claudeFileInput = el;
  };
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { keep(this); return; }
    return origClick.call(this);
  };
  if (origPicker) {
    HTMLInputElement.prototype.showPicker = function () {
      if (this.type === 'file') { keep(this); return; }
      return origPicker.call(this);
    };
  }
  // 다른 방식(파일 시스템 API)으로 창을 띄우려 하면 취소한 것으로 돌려줌
  window.showOpenFilePicker = () => Promise.reject(new DOMException('blocked for upload', 'AbortError'));
  window.__claudeHookRestore = () => {
    HTMLInputElement.prototype.click = origClick;
    if (origPicker) HTMLInputElement.prototype.showPicker = origPicker;
    window.showOpenFilePicker = origFsa;
    if (window.__claudeFileInput) window.__claudeFileInput.removeAttribute('aria-label');
    window.__claudeFileInput = null;
    window.__claudeHook = false;
    return 'restored';
  };
  window.__claudeHook = true;
  return 'hooked';
})()
