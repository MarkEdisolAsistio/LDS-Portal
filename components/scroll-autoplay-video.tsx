"use client";

import { useEffect, useRef } from "react";

export function ScrollAutoplayVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="block aspect-video w-full object-contain"
      controls
      muted
      playsInline
      preload="metadata"
      loop
    >
      <source src="/Learnware.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
}
