// videoTextures.jsx
import * as THREE from "three";

const isClient = typeof window !== "undefined";

const videos = {
  designWork: isClient
    ? (() => {
        if (window._designWorkVideo) {
          return {
            element: window._designWorkVideo,
            texture: window._designWorkTexture,
          };
        }

        const video = document.createElement("video");
        video.src = "/videos/designwork.mp4";
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.play();

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;

        window._designWorkVideo = video;
        window._designWorkTexture = texture;

        return { element: video, texture };
      })()
    : null,

  devWork: isClient
    ? (() => {
        if (window._devWorkVideo) {
          return {
            element: window._devWorkVideo,
            texture: window._devWorkTexture,
          };
        }

        const video = document.createElement("video");
        video.src = "/videos/devwork.mp4";
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.play();

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;

        window._devWorkVideo = video;
        window._devWorkTexture = texture;

        return { element: video, texture };
      })()
    : null,
};

export default videos;