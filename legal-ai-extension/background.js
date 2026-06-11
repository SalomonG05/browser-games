chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SELECTED_TEXT' && message.text?.trim().length > 10) {
    chrome.storage.session.set({ selectedText: message.text.trim() });
  }
});
