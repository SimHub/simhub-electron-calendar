function isTrustedSender(event, window, expectedURL) {
  try {
    if (!window || window.isDestroyed() || event.sender !== window.webContents) return false;
    const frame = event.senderFrame;
    if (!frame || frame !== window.webContents.mainFrame) return false;
    const actual = new URL(frame.url);
    // A fragment changes the position within this document, not its IPC permissions.
    // Keep the scheme, host, path and query checks exact; never trust only the origin.
    actual.hash = '';
    return actual.href === expectedURL;
  } catch {
    // Detached/destroyed frames and malformed URLs must fail closed.
    return false;
  }
}
module.exports = { isTrustedSender };
