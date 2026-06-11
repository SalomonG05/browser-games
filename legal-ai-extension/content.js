// Respond to explicit requests from the side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    sendResponse({ text: window.getSelection()?.toString().trim() ?? '' });
    return true;
  }
  if (message.type === 'GET_PAGE_TEXT') {
    const text = (document.body?.innerText ?? '')
      .replace(/\s{3,}/g, '\n\n')
      .trim()
      .slice(0, 20000);
    sendResponse({ text });
    return true;
  }
});
