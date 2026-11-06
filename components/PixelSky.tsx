"use client";

import { useEffect, useRef } from "react";
import { paintDayClouds } from "@/lib/day-clouds";

type Star = {
  x: number;
  y: number;
  phase: number;
  period: number;
  brightness: number;
  cross: boolean;
  hiddenUntil: number;
};

const NIGHT_SKY_COLORS = [
  [5, 6, 13],
  [7, 8, 17],
  [9, 10, 21],
  [12, 13, 25],
  [15, 15, 29],
  [18, 17, 33],
  [22, 20, 38],
];

const DAY_SKY_COLORS = [
  [222, 235, 247],
  [230, 237, 245],
  [238, 239, 240],
  [247, 241, 232],
  [253, 244, 227],
  [251, 234, 215],
  [247, 225, 203],
];

const DITHER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const PIXEL_SIZE = 2;
const FRAME_INTERVAL = 1000 / 12;

/** A decorative sky that never takes pointer events away from the app. */
export function PixelSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const background = document.createElement("canvas");
    const backgroundContext = background.getContext("2d");
    if (!backgroundContext) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stars: Star[] = [];
    let width = 1;
    let height = 1;
    let dark = false;
    let frameId = 0;
    let lastFrame = 0;
    let pointerX = -100;
    let pointerY = -100;

    function makeStar(): Star {
      return {
        x: Math.random(),
        y: Math.random(),
        phase: Math.random() * Math.PI * 2,
        period: 1600 + Math.random() * 3600,
        brightness: 0.38 + Math.random() * 0.5,
        cross: Math.random() > 0.87,
        hiddenUntil: 0,
      };
    }

    function paintBackground() {
      // One sky pixel covers six screen pixels. Ordered dithering keeps the
      // transition visibly pixelated instead of blurring it into a smooth fill.
      background.width = Math.max(1, Math.ceil(width / 3));
      background.height = Math.max(1, Math.ceil(height / 3));
      const pixels = backgroundContext!.createImageData(background.width, background.height);
      const colors = dark ? NIGHT_SKY_COLORS : DAY_SKY_COLORS;

      for (let y = 0; y < background.height; y += 1) {
        const level = (y / Math.max(1, background.height - 1)) * (colors.length - 1);
        const lower = Math.floor(level);
        const fraction = level - lower;

        for (let x = 0; x < background.width; x += 1) {
          const threshold = (DITHER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
          const color = colors[Math.min(lower + Number(fraction > threshold), colors.length - 1)];
          const offset = (y * background.width + x) * 4;
          pixels.data[offset] = color[0];
          pixels.data[offset + 1] = color[1];
          pixels.data[offset + 2] = color[2];
          pixels.data[offset + 3] = 255;
        }
      }

      backgroundContext!.putImageData(pixels, 0, 0);
      if (!dark) paintDayClouds(backgroundContext!, background.width, background.height);
    }

    function draw(now: number) {
      context!.globalAlpha = 1;
      context!.drawImage(background, 0, 0, width, height);
      if (!dark) return;

      for (const star of stars) {
        if (now < star.hiddenUntil) continue;

        const wave = motionPreference.matches
          ? 0.75
          : (Math.sin((now / star.period) * Math.PI * 2 + star.phase) + 1) / 2;
        // Discrete brightness steps give the stars a soft pixel-game flicker.
        const shimmer = Math.round(wave * 3) / 3;
        context!.globalAlpha = star.brightness * (0.35 + shimmer * 0.65);
        context!.fillStyle = star.cross ? "#e1d9f5" : "#babed9";
        const x = Math.round(star.x * (width - 1));
        const y = Math.round(star.y * (height - 1));
        context!.fillRect(x, y, 1, 1);

        if (star.cross) {
          context!.globalAlpha *= 0.5;
          context!.fillRect(x - 1, y, 1, 1);
          context!.fillRect(x + 1, y, 1, 1);
          context!.fillRect(x, y - 1, 1, 1);
          context!.fillRect(x, y + 1, 1, 1);
        }
      }

      context!.globalAlpha = 1;
    }

    function animate(now: number) {
      if (now - lastFrame >= FRAME_INTERVAL) {
        draw(now);
        lastFrame = now;
      }
      frameId = window.requestAnimationFrame(animate);
    }

    function syncPlayback() {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      const nextDark = document.documentElement.dataset.theme === "dark";
      if (dark !== nextDark) {
        dark = nextDark;
        paintBackground();
      }
      if (document.visibilityState !== "visible") return;

      if (motionPreference.matches) {
        for (const star of stars) star.hiddenUntil = 0;
      }
      lastFrame = performance.now();
      draw(lastFrame);
      // The daytime sky is cached; only the night stars need an animation loop.
      if (dark && !motionPreference.matches) {
        frameId = window.requestAnimationFrame(animate);
      }
    }

    function resize() {
      width = Math.max(1, Math.ceil(window.innerWidth / PIXEL_SIZE));
      height = Math.max(1, Math.ceil(window.innerHeight / PIXEL_SIZE));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.ceil(width * pixelRatio);
      canvas!.height = Math.ceil(height * pixelRatio);
      context!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context!.imageSmoothingEnabled = false;
      dark = document.documentElement.dataset.theme === "dark";
      paintBackground();

      const starCount = Math.max(36, Math.min(130, Math.round((width * height) / 3600)));
      while (stars.length < starCount) stars.push(makeStar());
      stars.length = starCount;
      syncPlayback();
    }

    function relocate(star: Star) {
      const previousX = star.x * width;
      const previousY = star.y * height;

      for (let attempt = 0; attempt < 12; attempt += 1) {
        star.x = Math.random();
        star.y = Math.random();
        const x = star.x * width;
        const y = star.y * height;
        if (
          Math.hypot(x - pointerX, y - pointerY) > 18 &&
          Math.hypot(x - previousX, y - previousY) > 24
        ) {
          return;
        }
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (!dark || document.visibilityState !== "visible" || event.pointerType === "touch") return;

      const bounds = canvas!.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * width;
      pointerY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * height;
      const now = performance.now();
      let changed = false;

      for (const star of stars) {
        if (now < star.hiddenUntil) continue;
        const distance = Math.hypot(star.x * width - pointerX, star.y * height - pointerY);
        if (distance > (star.cross ? 6 : 4)) continue;

        relocate(star);
        star.hiddenUntil = motionPreference.matches ? 0 : now + 180 + Math.random() * 180;
        changed = true;
      }

      if (changed) draw(now);
    }

    const themeObserver = new MutationObserver(syncPlayback);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", syncPlayback);
    motionPreference.addEventListener("change", syncPlayback);
    resize();

    return () => {
      window.cancelAnimationFrame(frameId);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", syncPlayback);
      motionPreference.removeEventListener("change", syncPlayback);
    };
  }, []);

  return <canvas ref={canvasRef} className="pixel-sky" aria-hidden="true" />;
}
