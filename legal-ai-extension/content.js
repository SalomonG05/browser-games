document.addEventListener('mouseup', () => {
  const text = window.getSelection()?.toString().trim() ?? '';
  if (text.length > 10) {
    chrome.runtime.sendMessage({ type: 'SELECTED_TEXT', text });
  }
});
