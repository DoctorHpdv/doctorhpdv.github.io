const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
};

document.querySelectorAll("[data-video-comparison]").forEach((comparison) => {
  const comparisonView = comparison.querySelector(".video-comparison-view");
  const splitSlider = comparison.querySelector(".comparison-slider");
  const baseVideo = comparison.querySelector(".compare-video-base");
  const topVideo = comparison.querySelector(".compare-video-top");
  const toggle = comparison.querySelector(".video-toggle");
  const toggleIcon = toggle.querySelector("span");
  const seek = comparison.querySelector(".video-seek");
  const time = comparison.querySelector(".video-time");
  let animationFrame;
  let isSeeking = false;
  let isDraggingSplit = false;

  const updateSplit = () => {
    comparisonView.style.setProperty("--position", `${splitSlider.value}%`);
  };

  const updateSplitFromPointer = (event) => {
    const bounds = comparisonView.getBoundingClientRect();
    const position = ((event.clientX - bounds.left) / bounds.width) * 100;
    splitSlider.value = Math.min(100, Math.max(0, position));
    updateSplit();
  };

  const stopSplitDrag = (event) => {
    if (!isDraggingSplit) return;
    isDraggingSplit = false;
    comparisonView.classList.remove("is-dragging");

    if (comparisonView.hasPointerCapture(event.pointerId)) {
      comparisonView.releasePointerCapture(event.pointerId);
    }
  };

  const duration = () => {
    const values = [baseVideo.duration, topVideo.duration].filter(Number.isFinite);
    return values.length ? Math.min(...values) : 0;
  };

  const syncVideos = () => {
    const drift = Math.abs(topVideo.currentTime - baseVideo.currentTime);
    if (drift > 0.045) topVideo.currentTime = baseVideo.currentTime;
  };

  const updateTimeline = () => {
    const total = duration();
    if (total) seek.max = total;
    if (!isSeeking) seek.value = baseVideo.currentTime;
    const displayedTime = isSeeking ? Number(seek.value) : baseVideo.currentTime;
    time.textContent = `${formatTime(displayedTime)} / ${formatTime(total)}`;

    if (!baseVideo.paused) {
      syncVideos();
      animationFrame = requestAnimationFrame(updateTimeline);
    }
  };

  const setPlayingState = (playing) => {
    const scene = comparison.querySelector("figcaption strong").textContent;
    toggle.classList.toggle("is-playing", playing);
    toggleIcon.textContent = playing ? "❚❚" : "▶";
    toggle.setAttribute("aria-label", `${playing ? "Pause" : "Play"} ${scene} comparison`);
  };

  const pauseBoth = () => {
    baseVideo.pause();
    topVideo.pause();
    cancelAnimationFrame(animationFrame);
    setPlayingState(false);
    updateTimeline();
  };

  const playBoth = async () => {
    topVideo.currentTime = baseVideo.currentTime;
    const results = await Promise.allSettled([baseVideo.play(), topVideo.play()]);
    const playing = results.some((result) => result.status === "fulfilled") && !baseVideo.paused;
    setPlayingState(playing);
    if (playing) updateTimeline();
  };

  const beginSeeking = () => {
    if (isSeeking) return;
    isSeeking = true;
  };

  const finishSeeking = () => {
    if (!isSeeking) return;
    const nextTime = Number(seek.value);
    baseVideo.currentTime = nextTime;
    topVideo.currentTime = nextTime;
    isSeeking = false;
    updateTimeline();
  };

  toggle.addEventListener("click", () => {
    if (baseVideo.paused) playBoth();
    else pauseBoth();
  });

  seek.addEventListener("pointerdown", beginSeeking);
  seek.addEventListener("keydown", beginSeeking);
  seek.addEventListener("input", () => {
    if (!isSeeking) beginSeeking();
    const nextTime = Number(seek.value);
    baseVideo.currentTime = nextTime;
    topVideo.currentTime = nextTime;
    updateTimeline();
  });
  seek.addEventListener("pointerup", finishSeeking);
  seek.addEventListener("pointercancel", finishSeeking);
  seek.addEventListener("change", finishSeeking);
  seek.addEventListener("keyup", finishSeeking);

  comparisonView.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    isDraggingSplit = true;
    comparisonView.classList.add("is-dragging");
    comparisonView.setPointerCapture(event.pointerId);
    updateSplitFromPointer(event);
  });
  comparisonView.addEventListener("pointermove", (event) => {
    if (!isDraggingSplit) return;
    updateSplitFromPointer(event);
  });
  comparisonView.addEventListener("pointerup", stopSplitDrag);
  comparisonView.addEventListener("pointercancel", stopSplitDrag);

  baseVideo.addEventListener("loadedmetadata", updateTimeline);
  topVideo.addEventListener("loadedmetadata", updateTimeline);
  baseVideo.addEventListener("pause", () => {
    cancelAnimationFrame(animationFrame);
    if (!topVideo.paused) topVideo.pause();
    setPlayingState(false);
  });
  baseVideo.addEventListener("play", () => setPlayingState(true));

  splitSlider.addEventListener("input", updateSplit);
  updateSplit();
  updateTimeline();
});
