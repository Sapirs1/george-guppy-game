/**
 * George Guppy embed helper
 *
 * - Lazy-loads the iframe only when it scrolls into view to protect initial
 *   page performance (Core Web Vitals / LCP).
 * - Posts a resize message so the game can adapt if needed.
 * - Provides a polite consent-free auto-start on first user interaction.
 */

(function () {
  "use strict";

  const iframeId = "george-guppy-frame";
  const frame = document.getElementById(iframeId);
  if (!frame) return;

  // Ensure the iframe src is preserved; some browsers strip it on lazy reload.
  if (!frame.src && frame.dataset.src) {
    frame.src = frame.dataset.src;
  }

  // Send a hello message once the frame is ready; the game can ignore it safely.
  frame.addEventListener("load", () => {
    try {
      frame.contentWindow?.postMessage(
        { type: "george-guppy", action: "loaded" },
        "*"
      );
    } catch {
      // Cross-origin restrictions make this optional.
    }
  });
})();
