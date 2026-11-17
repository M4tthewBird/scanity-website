// The hero film: plays only while it is on screen, and not at all for people who ask for reduced motion
// (they see the poster frame instead).
(() => {
  const video = document.querySelector('.hero-video');
  if (!video) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const play = () => {
    if (still.matches) return;
    const attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(() => {});
  };
  const apply = () => {
    if (still.matches) {
      video.removeAttribute('autoplay');
      video.pause();
    }
  };
  apply();
  still.addEventListener?.('change', () => (still.matches ? apply() : play()));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) play();
        else video.pause();
      }
    }, { threshold: 0.15 }).observe(video);
  }
})();
